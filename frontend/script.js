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
    datasets: [{
      label: "",
      data: [],
      borderWidth: 2,
      tension: 0.3
    }]
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
    // Extract Y values
    const yMatch = text.match(/temperature\s*=\s*\[([^\]]+)\]/i);
    if (!yMatch) return null;
    const y = yMatch[1].split(",").map(n => Number(n.trim()));

    // Extract X and Y labels
    const xLabelMatch = text.match(/x_label\s*=\s*([^\n]+)/i);
    const yLabelMatch = text.match(/y_label\s*=\s*([^\n]+)/i);

    return {
      x: Array.from({ length: y.length }, (_, i) => i + 1),
      y: y,
      xLabel: xLabelMatch ? xLabelMatch[1].trim() : "X",
      yLabel: yLabelMatch ? yLabelMatch[1].trim() : "Y"
    };
  } catch {
    return null;
  }
}

/* =======================
   Plot Function
======================= */
function plotXY(plot) {
  if (!plot || !plot.y) return;

  dataChart.data.labels = plot.x;
  dataChart.data.datasets[0].data = plot.y;
  dataChart.data.datasets[0].label = plot.yLabel || "Y";
  dataChart.options.scales.x.title.text = plot.xLabel || "X";
  dataChart.options.scales.y.title.text = plot.yLabel || "Y";

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
