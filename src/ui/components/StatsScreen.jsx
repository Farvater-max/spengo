export function StatsScreen() {
    return (
        <div className="stats-screen-inner">
            <div className="stats-chart-card">
                <div className="stats-chart-top">
                    <div className="stats-chart-info">
                        <div className="stats-total-label" id="stats-total-label"></div>
                        <div className="stats-total-amount" id="stats-total"></div>
                        <div className="stats-total-sub" id="stats-sub"></div>
                    </div>
                </div>
                <div className="stats-chart-wrap">
                    <canvas id="stats-chart"></canvas>
                    <div className="stats-chart-empty" id="stats-chart-empty" style={{ display: 'none' }}>
                        <div className="stats-chart-skeleton">
                            <div className="stats-chart-skeleton__bar" style={{ height: '55%' }}></div>
                            <div className="stats-chart-skeleton__bar" style={{ height: '75%' }}></div>
                            <div className="stats-chart-skeleton__bar" style={{ height: '40%' }}></div>
                            <div className="stats-chart-skeleton__bar" style={{ height: '65%' }}></div>
                        </div>
                        <span className="stats-empty-text stats-chart-empty__text" id="stats-chart-empty-text"></span>
                    </div>
                </div>
            </div>

            <div className="stats-donut-card">
                <div className="stats-bar-title" id="stats-by-cat-title"></div>
                <div className="stats-donut-wrap">
                    <canvas id="stats-donut"></canvas>
                    <div className="stats-donut-empty" style={{ display: 'none' }}>
                        <span
                            className="stats-empty-text"
                            id="stats-donut-empty-text"
                        />
                    </div>
                </div>
                <div id="stats-donut-legend" className="stats-donut-legend"></div>
            </div>
        </div>
    );
}