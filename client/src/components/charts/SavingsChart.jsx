/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const SavingsChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (data && data.length > 0) {
      const ctx = chartRef.current.getContext("2d");

      // Proses data untuk chart
      const labels = data.map((item) => item.month);
      const deposits = data.map((item) => item.deposits);
      const withdrawals = data.map((item) => item.withdrawals);

      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Setoran",
              data: deposits,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, "rgba(34, 197, 94, 0.8)");
                gradient.addColorStop(1, "rgba(34, 197, 94, 0.2)");
                return gradient;
              },
              borderColor: "rgba(34, 197, 94, 1)",
              borderWidth: 0,
              borderRadius: {
                topLeft: 8,
                topRight: 8,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: false,
            },
            {
              label: "Penarikan",
              data: withdrawals,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, "rgba(239, 68, 68, 0.8)");
                gradient.addColorStop(1, "rgba(239, 68, 68, 0.2)");
                return gradient;
              },
              borderColor: "rgba(239, 68, 68, 1)",
              borderWidth: 0,
              borderRadius: {
                topLeft: 8,
                topRight: 8,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  size: 13,
                  family: "Inter",
                  weight: "500",
                },
              },
            },
            tooltip: {
              backgroundColor: "rgba(17, 24, 39, 0.9)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
              cornerRadius: 12,
              displayColors: true,
              callbacks: {
                label: function (context) {
                  return (
                    context.dataset.label +
                    ": Rp " +
                    context.parsed.y.toLocaleString("id-ID")
                  );
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  size: 12,
                  family: "Inter",
                },
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.03)",
                drawBorder: false,
              },
              ticks: {
                font: {
                  size: 12,
                  family: "Inter",
                },
                callback: function (value) {
                  return "Rp " + value.toLocaleString("id-ID");
                },
              },
            },
          },
          animation: {
            duration: 2000,
            easing: "easeInOutQuart",
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-500 text-sm">
            Belum ada data untuk ditampilkan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Statistik Setoran & Penarikan
        </h3>
        <div className="relative h-80">
          <canvas ref={chartRef}></canvas>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Data berdasarkan transaksi yang sudah disetujui
        </p>
      </div>
    </div>
  );
};

export default SavingsChart;
