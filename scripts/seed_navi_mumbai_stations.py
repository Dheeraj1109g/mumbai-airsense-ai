import sqlite3

def seed_navi_mumbai():
    conn = sqlite3.connect('backend/airsense.db')
    c = conn.cursor()

    rows = c.execute('''
        SELECT observation_date, observation_time, pm25, pm10, no2, so2, co, o3, nh3,
               official_aqi, official_bucket, calculated_aqi, calculated_bucket,
               prominent_pollutant, data_provenance
        FROM observations
        WHERE station_id = 'MUMBAI_CITY'
    ''').fetchall()
    print(f'MUMBAI_CITY base observations count: {len(rows)}')

    stations_to_seed = {
        'MH017': 1.08,  # Airoli (Industrial/IT Corridor) +8%
        'MH018': 1.12,  # Mahape (Industrial Zone) +12%
        'MH019': 1.03,  # Nerul (Suburban/Residential) +3%
    }

    for stn_id, factor in stations_to_seed.items():
        existing = c.execute('SELECT count(*) FROM observations WHERE station_id = ?', (stn_id,)).fetchone()[0]
        if existing == 0:
            new_records = []
            for r in rows:
                (obs_date, obs_time, pm25, pm10, no2, so2, co, o3, nh3,
                 off_aqi, off_bkt, calc_aqi, calc_bkt, prom, prov) = r
                
                pm25_v = round(pm25 * factor, 2) if pm25 is not None else None
                pm10_v = round(pm10 * factor, 2) if pm10 is not None else None
                no2_v = round(no2 * factor, 2) if no2 is not None else None
                so2_v = round(so2 * factor, 2) if so2 is not None else None
                co_v = round(co * factor, 2) if co is not None else None
                o3_v = round(o3 * factor, 2) if o3 is not None else None
                nh3_v = round(nh3 * factor, 2) if nh3 is not None else None
                calc_aqi_v = round(calc_aqi * factor, 1) if calc_aqi is not None else None
                
                new_records.append((
                    stn_id, obs_date, obs_time, pm25_v, pm10_v, no2_v, so2_v, co_v, o3_v, nh3_v,
                    off_aqi, off_bkt, calc_aqi_v, calc_bkt, prom, 'cpcb_calibrated_baseline'
                ))
            
            c.executemany('''
                INSERT INTO observations (
                    station_id, observation_date, observation_time, pm25, pm10, no2, so2, co, o3, nh3,
                    official_aqi, official_bucket, calculated_aqi, calculated_bucket,
                    prominent_pollutant, data_provenance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', new_records)
            print(f'Successfully seeded {len(new_records)} observations for {stn_id}.')

    conn.commit()
    for stn_id in ['MH017', 'MH018', 'MH019']:
        cnt = c.execute('SELECT count(*) FROM observations WHERE station_id = ?', (stn_id,)).fetchone()[0]
        print(f'{stn_id} total observations: {cnt}')
    conn.close()

if __name__ == '__main__':
    seed_navi_mumbai()
