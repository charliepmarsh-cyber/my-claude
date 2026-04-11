import Header from '../components/Layout/Header';
import ChannelTable from '../components/Channels/ChannelTable';
import GoogleAdsCard from '../components/Channels/GoogleAdsCard';
import EmailCard from '../components/Channels/EmailCard';
import DeviceChart from '../components/Channels/DeviceChart';

export default function ChannelsPage() {
  return (
    <>
      <Header title="Channels" />
      <div className="p-6 space-y-6">
        <ChannelTable />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoogleAdsCard />
          <EmailCard />
        </div>
        <DeviceChart />
      </div>
    </>
  );
}
