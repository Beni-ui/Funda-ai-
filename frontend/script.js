const chatBox = document.getElementById("chatBox");
const input = document.getElementById("msg");
const ctx = document.getElementById("dataChart").getContext("2d");

/* =======================
   Chart Initialization
======================= */
const dataChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: []
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "X" } },
      y: { title: { display: true, text: "Y" } }
    }
  }
});

/* =======================
   UI Helpers
======================= */
async function addMessage(html, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.innerHTML = html;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (window.MathJax) {
    await MathJax.typesetPromise([div]);
  }
}

function handleKey(e) {
  if (e.key === "Enter") send();
}

/* =======================
   Text Parsing for Plot
======================= */
function extractPlotFromText(text) {
  try {
    // Extract all arrays like: varname = [values]
    const arrayMatches = text.match(/(\w+)\s*=\s*\[([^\]]+)\]/g);
    if (!arrayMatches) return null;

    const datasets = [];

    arrayMatches.forEach(item => {
      const parts = item.match(/(\w+)\s*=\s*\[([^\]]+)\]/);
      if (!parts) return;

      const label = parts[1].trim();
      const values = parts[2].split(",").map(n => Number(n.trim()));

      // Skip X, include all others (voltage, temperature, etc.)
      if (label.toLowerCase() !== "x") {
        datasets.push({ label, values });
      }
    });

    if (datasets.length === 0) return null;

    // Extract X values if provided
    const xMatch = text.match(/x\s*=\s*\[([^\]]+)\]/i);
    const x = xMatch
      ? xMatch[1].split(",").map(n => Number(n.trim()))
      : Array.from({ length: datasets[0].values.length }, (_, i) => i + 1);

    // Optional axis labels
    const xLabelMatch = text.match(/x_label\s*=\s*([^\n]+)/i);
    const yLabelMatch = text.match(/y_label\s*=\s*([^\n]+)/i);
    const xLabel = xLabelMatch ? xLabelMatch[1].trim() : "X";
    const yLabel = yLabelMatch ? yLabelMatch[1].trim() : "Y";

    return { x, datasets, xLabel, yLabel };
  } catch {
    return null;
  }
}

/* =======================
   Plot Function
======================= */
function plotXY(plot) {
  if (!plot || !plot.datasets) return;

  // Update labels and datasets
  dataChart.data.labels = plot.x;
  dataChart.data.datasets = plot.datasets.map(ds => ({
    label: ds.label,
    data: ds.values,
    borderWidth: 2,
    tension: 0.3
  }));

  // Update axis labels dynamically and ensure display
  dataChart.options.scales.x.title.display = true;
  dataChart.options.scales.x.title.text = plot.xLabel || "X";

  dataChart.options.scales.y.title.display = true;
  dataChart.options.scales.y.title.text = plot.yLabel || "Y";

  // Force Chart.js to apply updates
  dataChart.update();
}

/* =======================
   Main Send Function
======================= */
async function send() {
  const msg = input.value.trim();
  if (!msg) return;

  await addMessage(msg, "user");
  input.value = "";

  const thinking = document.createElement("div");
  thinking.className = "message bot";
  thinking.textContent = "FUNDABOT is thinking...";
  chatBox.appendChild(thinking);

  try {
    const res = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    const data = await res.json();
    thinking.remove();

    if (data.error) {
      await addMessage("❌ Server error: " + data.error, "bot");
      return;
    }

    await addMessage(data.reply, "bot");

    const plotData = extractPlotFromText(data.reply);
    if (plotData) plotXY(plotData);

  } catch (err) {
    thinking.remove();
    await addMessage("❌ Network error: " + err.message, "bot");
  }
}

// Bind Enter key
input.addEventListener("keydown", handleKey);
