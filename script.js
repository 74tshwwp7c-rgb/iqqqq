// Minimal interactive demo logic for hackathon presentation.
const demoBtn = document.getElementById('demoBtn');
const demoOutput = document.getElementById('demoOutput');

const demoSteps = [
  '👩‍🎓 Aigerim (Grade 10, rural school) selects: "National scholarship" goal.',
  '📘 Qadam builds a 7-day sprint: 20-min math, 15-min reading, 1 essay prompt.',
  '✅ Day 3 complete: streak grows, confidence meter increases to 62%.',
  '⏰ Deadline alert: "Scholarship application closes in 9 days."',
  '🚀 Action: Aigerim submits draft application with mentor-style feedback prompts.'
];

let currentStep = 0;

function runDemoStep() {
  demoOutput.textContent = demoSteps[currentStep];
  currentStep = (currentStep + 1) % demoSteps.length;
}

if (demoBtn) {
  demoBtn.addEventListener('click', runDemoStep);
}
