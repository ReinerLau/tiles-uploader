"use client";

import { useEffect, useRef } from "react";
import { Map, TileLayer } from "maptalks";

const MapViewer = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 创建地图实例
    const map = new Map(mapContainer.current, {
      center: [116.39105276720194, 39.91251388643247],
      zoom: 18,
      minZoom: 1,
      maxZoom: 19,
      baseLayer: new TileLayer("base", {
        urlTemplate: "/tile/{z}/{x}/{y}",
        tileSystem: [1, 1, -20037508.34, -20037508.34],
        debug: true,
      }),
    });

    mapInstance.current = map;

    // 清理函数
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapContainer} className="h-full w-full" />;
};

export default MapViewer;
