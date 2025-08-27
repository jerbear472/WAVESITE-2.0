export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse">
        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin" />
      </div>
    </div>
  );
}