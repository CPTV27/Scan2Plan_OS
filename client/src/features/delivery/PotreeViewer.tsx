import React, { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PotreeViewerProps {
    cloudUrl: string; // URL to metadata.json or cloud.js
}

declare global {
    interface Window {
        Potree: any;
        THREE: any;
        $?: any;
    }
}

export function PotreeViewer({ cloudUrl }: PotreeViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const potreeRef = useRef<any>(null);

    useEffect(() => {
        if (!viewerRef.current) return;

        // Dynamically load Potree scripts if not already loaded
        // Note: In a real production app, these should likely be in index.html or loaded via a loader
        // For this implementation, we assume valid Potree scripts (jquery, three, potree) are available globally
        // or we render a Placeholder if window.Potree is missing.

        if (!window.Potree) {
            console.error("Potree libraries not loaded");
            return;
        }

        if (potreeRef.current) return; // Already initialized

        const viewer = new window.Potree.Viewer(viewerRef.current);

        viewer.setEDLEnabled(true);
        viewer.setFOV(60);
        viewer.setPointBudget(1 * 1000 * 1000);
        viewer.setBackground("gradient");

        viewer.loadGUI(() => {
            viewer.setLanguage('en');
            // Hide some default tools for cleaner UI
            const menu = document.getElementById("potree_menu");
            if (menu) menu.style.display = "none";
        });

        window.Potree.loadPointCloud(cloudUrl, "Point Cloud", (e: any) => {
            const scene = viewer.scene;
            const pointcloud = e.pointcloud;

            const material = pointcloud.material;
            material.size = 1;
            material.pointSizeType = window.Potree.PointSizeType.ADAPTIVE;
            material.shape = window.Potree.PointShape.SQUARE;

            scene.addPointCloud(pointcloud);
            viewer.fitToScreen();
        });

        potreeRef.current = viewer;

        return () => {
            // Cleanup if necessary
        };
    }, [cloudUrl]);

    if (!window.Potree) {
        return (
            <Card className="flex items-center justify-center h-[500px] bg-slate-900 text-white">
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Potree Libraries Missing</h3>
                    <p className="text-sm text-gray-400">Please ensure Potree scripts are included in index.html</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="relative w-full h-[600px] bg-black rounded-lg overflow-hidden border border-gray-800">
            <div ref={viewerRef} className="absolute inset-0" id="potree_render_area"></div>
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => potreeRef.current?.fitToScreen()}>Reset View</Button>
            </div>
        </div>
    );
}
