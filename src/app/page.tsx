import FolderTree from "./components/FolderTree";
import MapViewer from "./components/MapViewer";

export default function Home() {
  return (
    <div className="flex h-full p-4 gap-2">
      <FolderTree />
      <div className="flex-1 h-full">
        <MapViewer />
      </div>
    </div>
  );
}
