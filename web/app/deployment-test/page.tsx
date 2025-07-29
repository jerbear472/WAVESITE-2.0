export default function DeploymentTest() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">DEPLOYMENT TEST</h1>
        <p className="text-2xl">If you can see this page, Vercel deployment is working!</p>
        <p className="text-xl mt-4">Deployed at: {new Date().toISOString()}</p>
        <p className="text-lg mt-2 text-green-400">Enhanced Verify Page v2.0 is also deployed!</p>
      </div>
    </div>
  );
}