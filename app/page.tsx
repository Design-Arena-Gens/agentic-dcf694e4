import Chat from "../components/Chat";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">AI Customer Support</h1>
        <p className="text-gray-600">Ask anything about our product and policies.</p>
      </header>
      <Chat />
      <footer className="mt-8 text-xs text-gray-500">
        Responses may be AI-generated; verify important details.
      </footer>
    </main>
  );
}
