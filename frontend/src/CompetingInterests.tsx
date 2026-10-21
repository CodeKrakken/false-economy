import type { InterestGroups } from "../shared.types.js";
import { formatPercent } from "../shared.functions.js";

type CompetingInterestsProps = {
  groups: InterestGroups;
};

function CompetingInterests({ groups }: CompetingInterestsProps) {
  return (
    <section className="groups-section" aria-labelledby="groups-title">
      <div className="section-heading">
        <h2 id="groups-title">Competing interests</h2>
      </div>
      <dl className="groups-grid">
        <div><dt>Workers</dt><dd>{formatPercent(groups.workers)}</dd></div>
        <div><dt>Businesses</dt><dd>{formatPercent(groups.businesses)}</dd></div>
        <div><dt>Public sector</dt><dd>{formatPercent(groups.publicSector)}</dd></div>
      </dl>
    </section>
  );
}

export default CompetingInterests;
