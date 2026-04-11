import Header from '../components/Layout/Header';
import AIOverview from '../components/AIReferrals/AIOverview';

export default function AIReferralsPage() {
  return (
    <>
      <Header title="AI Referrals" />
      <div className="p-6">
        <AIOverview />
      </div>
    </>
  );
}
