import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Economy, IndicatorSnapshot } from "./economy.js";
import { formatIndicator, formatPercent } from "./indicators";
import type { Indicator } from "./indicators";

type IndicatorCardProps = {
  economy: Economy;
  history: IndicatorSnapshot[];
  indicator: Indicator;
};

function IndicatorCard({ economy, history, indicator }: IndicatorCardProps) {
  const value = economy[indicator.key];
  const chartData = history.map((entry) => ({
    turn: entry.turn,
    value: Number.isFinite(entry[indicator.key]) ? entry[indicator.key] : null,
  }));

  return (
    <div className={`metric${indicator.key === "gdp" ? " metric-primary" : ""}`}>
      <dt>{indicator.name}</dt>
      <dd className="metric-readout">
        <div
          className="metric-chart"
          role="img"
          aria-label={`${indicator.name} history through turn ${economy.turn}`}
        >
          <ResponsiveContainer
            width="100%"
            height={64}
            minWidth={0}
            initialDimension={{ width: 260, height: 64 }}
          >
            <LineChart data={chartData} margin={{ top: 5, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="#e4dfd6" />
              <XAxis
                dataKey="turn"
                type="number"
                tickCount={3}
                tick={{ fontSize: 9, fill: "#66635e" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(turn) => `Turn ${turn}`}
                formatter={(chartValue) => formatIndicator(Number(chartValue), indicator.format)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={indicator.color}
                strokeWidth={2}
                dot={history.length === 1 ? { r: 2 } : false}
                activeDot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="metric-value">
          <span className="metric-current">{formatIndicator(value, indicator.format)}</span>
          <span className="metric-unit">{indicator.unit}</span>
          {indicator.key === "gdp" && (
            <span className="metric-growth">{formatPercent(economy.growthRate)} growth</span>
          )}
        </div>
      </dd>
    </div>
  );
}

export default IndicatorCard;
