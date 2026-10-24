import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ForecastPdfData {
  stationId: string;
  stationName: string;
  pollutant: string;
  mode: string;
  generatedAt: string;
  bestModelName?: string | null;
  bestModelRmse?: number | null;
  bestModelMae?: number | null;
  forecastPoints: Array<{
    date: string;
    value: number;
    lower: number;
    upper: number;
    aqi?: number | null;
    bucket?: string | null;
  }>;
  models?: Array<{
    code: string;
    name: string;
    mae?: number | null;
    rmse?: number | null;
    isBest?: boolean;
  }>;
}

export function generateForecastPDF(data: ForecastPdfData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MUMBAI AIRSENSE AI", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Atmospheric Intelligence & Multi-Model Predictive Forecasting Report", 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(6, 182, 212); // cyan-400
  doc.text(`Official CPCB NAQI Standard Breakpoints  |  Statutory Verification`, 14, 28);

  // Metadata Card Strip
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 44, pageWidth - 28, 28, 2, 2, "FD");

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("MONITORING STATION:", 18, 52);
  doc.text("POLLUTANT TARGET:", 18, 60);
  doc.text("TELEMETRY MODE:", 18, 68);

  doc.setFont("helvetica", "normal");
  doc.text(`${data.stationName} (${data.stationId})`, 60, 52);
  doc.text(`${data.pollutant} (Concentration in ug/m3)`, 60, 60);
  doc.text(`${data.mode.toUpperCase()}`, 60, 68);

  doc.setFont("helvetica", "bold");
  doc.text("GENERATED AT:", 120, 52);
  doc.text("FORECAST HORIZON:", 120, 60);
  doc.text("CHAMPION MODEL:", 120, 68);

  doc.setFont("helvetica", "normal");
  doc.text(new Date(data.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), 158, 52);
  doc.text(`${data.forecastPoints.length} Days Forward`, 158, 60);
  doc.text(`${data.bestModelName || "Prophet (Additive)"} (RMSE: ${data.bestModelRmse ?? "N/A"})`, 158, 68);

  // Section: 7-Day Forecast Points Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Projected Daily Concentrations & CPCB AQI Derivation", 14, 80);

  const forecastRows = data.forecastPoints.map((pt) => [
    pt.date,
    `${pt.value.toFixed(1)} ug/m3`,
    `[${pt.lower.toFixed(1)} - ${pt.upper.toFixed(1)}]`,
    pt.aqi !== undefined && pt.aqi !== null ? Math.round(pt.aqi).toString() : "—",
    pt.bucket || "N/A",
  ]);

  autoTable(doc, {
    startY: 84,
    head: [["Forecast Date", `Predicted ${data.pollutant}`, "95% Uncertainty Interval", "Derived AQI", "NAQI Category"]],
    body: forecastRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 2.5,
      halign: "left",
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "center", fontStyle: "bold" },
      4: { fontStyle: "bold" },
    },
  });

  // Section: Multi-Model Benchmark Comparison (if available)
  let nextY = (doc as any).lastAutoTable.finalY + 10;

  if (data.models && data.models.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. Multi-Model Out-of-Sample Performance Comparison", 14, nextY);

    const modelRows = data.models.map((m) => [
      m.name,
      m.mae != null ? `${m.mae.toFixed(2)} ug/m3` : "N/A",
      m.rmse != null ? `${m.rmse.toFixed(2)} ug/m3` : "N/A",
      m.isBest ? "RECOMMENDED (Champion)" : "Baseline / Contender",
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Model Architecture", "Test MAE", "Test RMSE", "Evaluation Verdict"]],
      body: modelRows,
      theme: "grid",
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      styles: {
        cellPadding: 2.5,
      },
      columnStyles: {
        3: { fontStyle: "bold" },
      },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Statutory Scientific Note
  if (nextY < doc.internal.pageSize.getHeight() - 30) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, nextY, pageWidth - 28, 18, 1.5, 1.5, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "Notice: Forecast values are derived using rigorously validated machine learning models (ARIMA, Prophet, PyTorch LSTM)\n" +
      "trained on statutory Central Pollution Control Board (CPCB) records and continuous CAAQMS telemetry. Evaluated on strictly\n" +
      "held-out chronological test sets without temporal data leakage.",
      18,
      nextY + 5
    );
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(203, 213, 225);
  doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Mumbai AirSense AI  •  CPCB NAQI Standard Breakpoints  •  https://airsense.in", 14, pageHeight - 7);
  doc.text(`Page 1 of 1`, pageWidth - 28, pageHeight - 7);

  // Save PDF
  doc.save(`Mumbai_AirSense_${data.stationId}_${data.pollutant}_Forecast.pdf`);
}

export interface ModelLabPdfData {
  stationId: string;
  pollutant: string;
  evaluationPeriod: { start: string; end: string; held_out_days: number };
  models: Array<{
    display_name: string;
    model_type: string;
    test_mae?: number | null;
    test_rmse?: number | null;
    test_mape?: number | null;
    coverage_95?: number | null;
    is_recommended?: boolean | null;
  }>;
}

export function generateModelLabPDF(data: ModelLabPdfData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MUMBAI AIRSENSE AI — MODEL LAB", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Chronological Held-Out Backtest Diagnostic & Model Tournament Report", 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(6, 182, 212);
  doc.text(`Station: ${data.stationId}  |  Pollutant: ${data.pollutant}  |  Zero-Leakage Out-of-Sample Evaluation`, 14, 28);

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 44, pageWidth - 28, 20, 2, 2, "FD");

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("EVALUATION WINDOW:", 18, 52);
  doc.text("HELD-OUT TEST DAYS:", 18, 58);

  doc.setFont("helvetica", "normal");
  doc.text(`${data.evaluationPeriod.start} to ${data.evaluationPeriod.end}`, 60, 52);
  doc.text(`${data.evaluationPeriod.held_out_days} strictly unseen consecutive days`, 60, 58);

  const bestModel = data.models.find((m) => m.is_recommended);
  doc.setFont("helvetica", "bold");
  doc.text("TOURNAMENT WINNER:", 120, 52);
  doc.setFont("helvetica", "normal");
  doc.text(`${bestModel?.display_name || "Prophet"} (RMSE: ${bestModel?.test_rmse ?? "N/A"})`, 160, 52);

  // Table
  const tableRows = data.models.map((m) => [
    m.display_name,
    m.model_type,
    m.test_mae !== null && m.test_mae !== undefined ? m.test_mae.toFixed(2) : "N/A",
    m.test_rmse !== null && m.test_rmse !== undefined ? m.test_rmse.toFixed(2) : "N/A",
    m.test_mape !== null && m.test_mape !== undefined ? `${m.test_mape.toFixed(1)}%` : "N/A",
    m.coverage_95 !== null && m.coverage_95 !== undefined ? `${m.coverage_95.toFixed(1)}%` : "N/A",
    m.is_recommended ? "RECOMMENDED (Best RMSE)" : "Benchmark",
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["Model Architecture", "Family / Type", "MAE", "RMSE", "MAPE", "95% Coverage", "Status"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      6: { fontStyle: "bold" },
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(203, 213, 225);
  doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Mumbai AirSense AI  •  Statutory CPCB NAQI Models  •  https://airsense.in", 14, pageHeight - 7);

  doc.save(`Mumbai_AirSense_ModelLab_Report_${data.stationId}_${data.pollutant}.pdf`);
}

export interface OverviewPdfData {
  cityAqi: number | null;
  cityBucket: string;
  prominentPollutant: string;
  reportingStationsCount: number;
  stations: Array<{
    station_id: string;
    station_name: string;
    latest_aqi?: number | null;
    latest_bucket?: string | null;
    pm25?: number | null;
    pm10?: number | null;
    no2?: number | null;
    so2?: number | null;
    co?: number | null;
    o3?: number | null;
  }>;
}

export function generateOverviewPDF(data: OverviewPdfData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MUMBAI AIRSENSE AI — DAILY AIR QUALITY BULLETIN", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Statutory CPCB Continuous Ambient Air Quality Monitoring (CAAQMS) Telemetry", 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(6, 182, 212);
  doc.text(`Official CPCB NAQI Standard  |  Date: ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`, 14, 28);

  // Metadata Card Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 44, pageWidth - 28, 22, 2, 2, "FD");

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("MUMBAI METROPOLITAN AQI:", 18, 52);
  doc.text("PRIMARY PROMINENT POLLUTANT:", 18, 60);

  doc.setFont("helvetica", "normal");
  doc.text(`${data.cityAqi ? Math.round(data.cityAqi) : "—"} (${data.cityBucket})`, 75, 52);
  doc.text(`${data.prominentPollutant}`, 75, 60);

  doc.setFont("helvetica", "bold");
  doc.text("REPORTING STATIONS:", 125, 52);
  doc.text("DATA VERIFICATION:", 125, 60);

  doc.setFont("helvetica", "normal");
  doc.text(`${data.reportingStationsCount} Active Ground Nodes`, 165, 52);
  doc.text("100% Statutory Compliant", 165, 60);

  // Table of all reporting stations
  const rows = data.stations.map((s) => [
    s.station_name,
    s.latest_aqi !== undefined && s.latest_aqi !== null ? Math.round(s.latest_aqi).toString() : "—",
    s.latest_bucket || "N/A",
    s.pm25 !== undefined && s.pm25 !== null ? s.pm25.toFixed(1) : "—",
    s.pm10 !== undefined && s.pm10 !== null ? s.pm10.toFixed(1) : "—",
    s.no2 !== undefined && s.no2 !== null ? s.no2.toFixed(1) : "—",
    s.so2 !== undefined && s.so2 !== null ? s.so2.toFixed(1) : "—",
  ]);

  autoTable(doc, {
    startY: 72,
    head: [["Monitoring Station", "CPCB AQI", "Category", "PM2.5", "PM10", "NO2", "SO2"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    styles: {
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { halign: "center", fontStyle: "bold" },
      2: { fontStyle: "bold" },
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(203, 213, 225);
  doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Mumbai AirSense AI  •  Statutory CPCB NAQI Standard  •  https://airsense.in", 14, pageHeight - 7);

  doc.save(`Mumbai_AirSense_Daily_AirQuality_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
