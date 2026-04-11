import Header from '../components/Layout/Header';
import KPICard from '../components/Dashboard/KPICard';
import ExperimentCard from '../components/ABTesting/ExperimentCard';
import { FlaskConical, Users, TrendingUp, Target } from 'lucide-react';
import { demoData } from '../data/demo';

export default function ABTestingPage() {
  const exps = demoData.abTesting.experiments;
  const running = exps.filter(e => e.status === 'running').length;
  const totalTraffic = exps.reduce((s, e) => s + e.traffic, 0);
  const bestUplift = Math.max(...exps.map(e => e.uplift));
  const avgSig = (exps.reduce((s, e) => s + e.significance, 0) / exps.length * 100).toFixed(0);

  return (
    <>
      <Header title="A/B Testing" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Active Experiments"
            value={running.toString()}
            subtitle={`${exps.length} total`}
            icon={<FlaskConical className="w-5 h-5 text-blue-600" />}
            color="from-blue-50 to-blue-100"
          />
          <KPICard
            title="Traffic in Tests"
            value={totalTraffic.toLocaleString()}
            icon={<Users className="w-5 h-5 text-violet-600" />}
            color="from-violet-50 to-violet-100"
          />
          <KPICard
            title="Best Uplift"
            value={`+${bestUplift}%`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            color="from-emerald-50 to-emerald-100"
          />
          <KPICard
            title="Avg Significance"
            value={`${avgSig}%`}
            icon={<Target className="w-5 h-5 text-amber-600" />}
            color="from-amber-50 to-amber-100"
          />
        </div>

        <div className="space-y-4">
          {exps.map(exp => (
            <ExperimentCard key={exp.id} exp={exp} />
          ))}
        </div>

        <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition text-sm font-medium">
          + Create New Experiment
        </button>
      </div>
    </>
  );
}
