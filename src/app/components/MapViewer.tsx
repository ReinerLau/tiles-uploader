"use client";

import { useEffect, useRef } from "react";
import { Map, TileLayer, Marker, VectorLayer } from "maptalks";

const center = [116.39105276720194, 39.91251388643247];

const MapViewer = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 创建地图实例
    const map = new Map(mapContainer.current, {
      center,
      zoom: 18,
      minZoom: 1,
      maxZoom: 19,
      dragPitch: false,
      dragRotate: false,
      baseLayer: new TileLayer("base", {
        urlTemplate: "/tile/{z}/{x}/{y}",
        tileSystem: [1, 1, -20037508.34, -20037508.34],
        debug: true,
      }),
    });
    // 在地图中心创建 Marker
    const centerMarker = new Marker(center);

    // 创建矢量图层用于存放 Marker
    const vectorLayer = new VectorLayer("center");

    // 将 Marker 添加到矢量图层
    vectorLayer.addGeometry(centerMarker);

    // 将矢量图层添加到地图
    map.addLayer(vectorLayer);

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
