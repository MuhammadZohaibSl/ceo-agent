import { VisionEditor } from "@/components/vision/vision-editor";

export default function VisionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Strategic Vision
          </h1>
          <p className="text-slate-400">
            Generate, edit, and manage your company&apos;s strategic vision
          </p>
        </div>
        
        <VisionEditor />
      </div>
    </div>
  );
}
