import Header from '../components/Layout/Header';
import JourneyTimeline from '../components/Attribution/JourneyTimeline';

export default function AttributionPage() {
  return (
    <>
      <Header title="Attribution" />
      <div className="p-6">
        <JourneyTimeline />
      </div>
    </>
  );
}
