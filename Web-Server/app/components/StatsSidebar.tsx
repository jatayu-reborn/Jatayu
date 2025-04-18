'use client';

type StatsProps = {
  stats: {
    severe: number;
    intermediate: number;
    normal: number;
    unknown: number;
    total: number;
  };
};

export default function StatsSidebar({ stats }: StatsProps) {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-black/80 backdrop-blur-md text-white p-6 shadow-lg border-r border-white/10">
      <h2 className="text-xl font-bold mb-6 text-center">Dashboard Statistics</h2>
      
      <div className="space-y-4">
        <div className="stat-card bg-red-500/20 p-4 rounded-lg border border-red-500/30">
          <h3 className="text-sm font-medium text-red-400">Severe</h3>
          <p className="text-2xl font-bold">{stats.severe}</p>
        </div>

        <div className="stat-card bg-yellow-500/20 p-4 rounded-lg border border-yellow-500/30">
          <h3 className="text-sm font-medium text-yellow-400">Intermediate</h3>
          <p className="text-2xl font-bold">{stats.intermediate}</p>
        </div>

        <div className="stat-card bg-green-500/20 p-4 rounded-lg border border-green-500/30">
          <h3 className="text-sm font-medium text-green-400">Normal</h3>
          <p className="text-2xl font-bold">{stats.normal}</p>
        </div>

        <div className="stat-card bg-gray-500/20 p-4 rounded-lg border border-gray-500/30">
          <h3 className="text-sm font-medium text-gray-400">Unknown</h3>
          <p className="text-2xl font-bold">{stats.unknown}</p>
        </div>

        <div className="stat-card bg-blue-500/20 p-4 rounded-lg border border-blue-500/30 mt-8">
          <h3 className="text-sm font-medium text-blue-400">Total Cases</h3>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </div>
    </div>
  );
}
