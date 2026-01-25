import { useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const test = async () => {
    const r = await fetch(`${API}/health`);
    setData(await r.json());
  };

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>FTSLine Frontend ✅</h1>
      <button onClick={test}>Backend Health Test</button>
      <pre style={{ marginTop: 16 }}>
        {data ? JSON.stringify(data, null, 2) : "Henüz test edilmedi."}
      </pre>
    </div>
  );
}
