import Header from '../components/Layout/Header';
import Overview from '../components/Dashboard/Overview';

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <Overview />
      </div>
    </>
  );
}
