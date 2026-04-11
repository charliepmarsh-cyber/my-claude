import Header from '../components/Layout/Header';
import ChatPanel from '../components/AIAssistant/ChatPanel';

export default function AIAssistantPage() {
  return (
    <>
      <Header title="AI Assistant" />
      <div className="p-6">
        <ChatPanel />
      </div>
    </>
  );
}
