import type { Economy, IndicatorSnapshot } from "../shared.types.js";
import { INDICATORS } from "../shared.data.js";
import IndicatorCard from "./IndicatorCard";

type EconomicIndicatorsProps = {
  economy: Economy;
  history: IndicatorSnapshot[];
};

function EconomicIndicators({ economy, history }: EconomicIndicatorsProps) {
  return (
    <section className="economy-section" aria-labelledby="indicators-title">
      <div className="section-heading">
        <h2 id="indicators-title">Economic indicators</h2>
      </div>
      <dl className="metrics-grid">
        {INDICATORS.map((indicator) => (
          <IndicatorCard
            key={indicator.key}
            economy={economy}
            history={history}
            indicator={indicator}
          />
        ))}
      </dl>
    </section>
  );
}

export default EconomicIndicators;
