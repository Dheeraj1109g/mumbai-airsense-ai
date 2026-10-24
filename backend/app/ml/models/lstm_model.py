"""
PyTorch Recurrent LSTM Neural Network Forecaster.
Learns non-linear temporal dependencies from sliding historical windows.
Employs strictly leak-free MinMaxScaler normalization and calibrated residual intervals.
"""

from typing import Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler
from app.ml.dataset_loader import create_lstm_sequences

class PyTorchLSTM(nn.Module):
    def __init__(self, input_size: int = 1, hidden_size: int = 32, horizon: int = 7):
        super().__init__()
        self.lstm = nn.LSTM(input_size=input_size, hidden_size=hidden_size, num_layers=1, batch_first=True)
        self.fc1 = nn.Linear(hidden_size, 16)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(16, horizon)

    def forward(self, x):
        # x: (batch, seq_len, 1)
        out, (hn, cn) = self.lstm(x)
        # Take final time-step hidden state
        last_hidden = out[:, -1, :]
        h = self.relu(self.fc1(last_hidden))
        out = self.fc2(h)
        return out

class LSTMForecaster:
    def __init__(self, seq_length: int = 14, horizon: int = 7):
        self.seq_length = seq_length
        self.horizon = horizon
        self.model_code: str = "lstm"
        self.version_tag: str = "v1.0-PyTorchLSTM"
        self.scaler = MinMaxScaler(feature_range=(0.0, 1.0))
        self.net: PyTorchLSTM = None
        self.residual_std: float = 12.0
        self.last_window: np.ndarray = None

    def fit(self, train_series: np.ndarray, epochs: int = 40):
        train_series = np.asarray(train_series, dtype=float).reshape(-1, 1)
        # Scale only on train series
        scaled_train = self.scaler.fit_transform(train_series).flatten()

        X, y = create_lstm_sequences(scaled_train, self.seq_length, self.horizon)
        if len(X) < 10:
            raise ValueError("Insufficient sequence window samples to train LSTM.")

        # Store last sequence window for future inference
        self.last_window = scaled_train[-self.seq_length:]

        # PyTorch Tensors
        X_tensor = torch.tensor(X, dtype=torch.float32).unsqueeze(-1)
        y_tensor = torch.tensor(y, dtype=torch.float32)

        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=16, shuffle=True)

        self.net = PyTorchLSTM(input_size=1, hidden_size=32, horizon=self.horizon)
        optimizer = torch.optim.Adam(self.net.parameters(), lr=0.01)
        criterion = nn.MSELoss()

        self.net.train()
        for epoch in range(epochs):
            for batch_x, batch_y in dataloader:
                optimizer.zero_grad()
                pred = self.net(batch_x)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()

        # Compute empirical residual standard error on train predictions
        self.net.eval()
        with torch.no_grad():
            preds_scaled = self.net(X_tensor).numpy()
            y_unscaled = self.scaler.inverse_transform(y)
            # Inverse transform multi-horizon predictions
            preds_unscaled = np.zeros_like(preds_scaled)
            for h in range(self.horizon):
                preds_unscaled[:, h] = self.scaler.inverse_transform(preds_scaled[:, h].reshape(-1, 1)).flatten()
            residuals = y_unscaled - preds_unscaled
            self.residual_std = float(np.std(residuals)) if len(residuals) > 0 else 12.0

    def predict(self, horizon: int = 7, input_window: np.ndarray = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if self.net is None:
            raise ValueError("LSTM model must be fitted prior to running predictions.")

        if input_window is not None:
            raw_w = np.asarray(input_window, dtype=float).reshape(-1, 1)
            window = self.scaler.transform(raw_w).flatten()[-self.seq_length:]
        else:
            window = self.last_window

        self.net.eval()
        with torch.no_grad():
            x_in = torch.tensor(window, dtype=torch.float32).unsqueeze(0).unsqueeze(-1)
            scaled_preds = self.net(x_in).numpy().flatten()[:horizon]

            # Invert scaling
            dummy = np.zeros((len(scaled_preds), 1))
            dummy[:, 0] = scaled_preds
            preds = self.scaler.inverse_transform(dummy).flatten()
            preds = np.maximum(0.0, preds)

            # Calibrate empirical interval
            multipliers = np.sqrt(np.arange(1, horizon + 1))
            half_widths = 1.96 * self.residual_std * multipliers * 0.45
            lower = np.maximum(0.0, preds - half_widths)
            upper = preds + half_widths

            return preds, lower, upper
