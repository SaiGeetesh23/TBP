import { CanvasContent } from "@/types";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
});

export const Canvas = ({ content }: { content: CanvasContent | null }) => {
    if (!content) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="text-center">
                    <div className="text-2xl mb-4">🌊</div>
                    <p className="text-gray-500 text-lg">Your interactive visualizations will appear here.</p>
                </div>
            </div>
        );
    }

    if (content.type === 'plotly') {
        try {
            const plotData = JSON.parse(content.data);
            const layout = { ...plotData.layout, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#E2E2E2' }, xaxis: { ...plotData.layout.xaxis, gridcolor: 'rgba(255, 255, 255, 0.1)', }, yaxis: { ...plotData.layout.yaxis, gridcolor: 'rgba(255, 255, 255, 0.1)', } };
            return (
                <div className="w-full h-full p-4 rounded-lg">
                    <Plot data={plotData.data} layout={layout} style={{ width: '100%', height: '100%' }} useResizeHandler={true} />
                </div>
            );
        } catch (error) {
            console.error("Failed to parse or render Plotly JSON:", error);
            return <div className="text-red-500">Error rendering plot.</div>;
        }
    }
    return null;
};
