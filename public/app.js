const form = document.getElementById('password-form');
const lengthInput = document.getElementById('length');
const lengthValue = document.getElementById('length-value');
const passwordOutput = document.getElementById('password');
const copyButton = document.getElementById('copy');
const strengthLabel = document.getElementById('strength-label');
const meterFill = document.getElementById('meter-fill');
const helperText = document.getElementById('helper-text');

const submitButton = form.querySelector('button[type="submit"]');

lengthValue.textContent = lengthInput.value;
lengthInput.addEventListener('input', () => {
  lengthValue.textContent = lengthInput.value;
  updateStrengthPreview();
});

form.addEventListener('change', () => {
  updateStrengthPreview();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = getFormPayload();

  if (!payload.includeLowercase && !payload.includeUppercase && !payload.includeNumbers && !payload.includeSymbols) {
    renderError('Choose at least one character type.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Generating…';
  helperText.textContent = '';

  try {
    const response = await fetch('/api/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const { error } = await response.json().catch(() => ({ error: 'Unable to generate password.' }));
      throw new Error(error);
    }

    const { password } = await response.json();
    passwordOutput.textContent = password;
    updateStrengthIndicators(password, payload);
    helperText.textContent = 'Password generated successfully. Copy it into your password manager right away!';
  } catch (error) {
    renderError(error.message || 'Unable to generate password.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Generate password';
  }
});

copyButton.addEventListener('click', async () => {
  const password = passwordOutput.textContent.trim();
  if (!password || password === 'Click generate to get started') {
    helperText.textContent = 'Generate a password before copying.';
    return;
  }

  try {
    await navigator.clipboard.writeText(password);
    copyButton.textContent = 'Copied!';
    helperText.textContent = 'Password copied to your clipboard.';
    setTimeout(() => {
      copyButton.textContent = 'Copy';
    }, 2000);
  } catch (error) {
    helperText.textContent = 'Clipboard access is blocked. Copy manually instead.';
  }
});

function getFormPayload() {
  const formData = new FormData(form);
  return {
    length: Number(formData.get('length')),
    includeLowercase: formData.get('includeLowercase') === 'on',
    includeUppercase: formData.get('includeUppercase') === 'on',
    includeNumbers: formData.get('includeNumbers') === 'on',
    includeSymbols: formData.get('includeSymbols') === 'on',
    excludeSimilar: formData.get('excludeSimilar') === 'on'
  };
}

function updateStrengthIndicators(password, payload) {
  const { score, label, recommendation } = evaluateStrength(password, payload);
  const width = Math.min(Math.max(score, 10), 100);

  meterFill.style.width = `${width}%`;
  meterFill.style.background = getStrengthGradient(score);
  strengthLabel.textContent = `Strength: ${label}`;
  helperText.textContent = recommendation;
}

function updateStrengthPreview() {
  const payload = getFormPayload();
  const { score, label, recommendation } = evaluateStrength('preview', payload);
  meterFill.style.width = `${Math.min(Math.max(score, 5), 100)}%`;
  meterFill.style.background = getStrengthGradient(score);
  strengthLabel.textContent = `Strength: ${label}`;
  helperText.textContent = recommendation;
}

function evaluateStrength(password, options) {
  const { length, includeLowercase, includeUppercase, includeNumbers, includeSymbols, excludeSimilar } = options;
  const charsetCount = [includeLowercase, includeUppercase, includeNumbers, includeSymbols].filter(Boolean).length;
  let score = 0;

  score += Math.min(length * 4, 60);
  score += charsetCount * 10;
  if (excludeSimilar) score += 4;
  if (password.length >= 20) score += 10;
  if (password.length >= 32) score += 16;

  const normalized = Math.min(score, 100);

  let label = 'Weak';
  let recommendation = 'Short passwords are easier to crack. Increase the length and mix character types.';

  if (normalized >= 80) {
    label = 'Exceptional';
    recommendation = 'This password is highly resilient. Store it securely and rotate it periodically.';
  } else if (normalized >= 60) {
    label = 'Strong';
    recommendation = 'Great job! Consider enabling MFA for the account that uses this password.';
  } else if (normalized >= 40) {
    label = 'Moderate';
    recommendation = 'Strengthen the password by adding symbols or extending the length beyond 16 characters.';
  }

  if (charsetCount === 0) {
    label = 'N/A';
    recommendation = 'Select at least one character type to generate a password.';
    score = 0;
  }

  return { score: Math.min(score, 100), label, recommendation };
}

function getStrengthGradient(score) {
  if (score >= 75) return 'linear-gradient(90deg, #22c55e, #16a34a)';
  if (score >= 50) return 'linear-gradient(90deg, #facc15, #f97316)';
  if (score >= 25) return 'linear-gradient(90deg, #f97316, #ef4444)';
  return 'linear-gradient(90deg, #ef4444, #dc2626)';
}

function renderError(message) {
  passwordOutput.textContent = message;
  strengthLabel.textContent = 'Strength: —';
  meterFill.style.width = '0%';
  helperText.textContent = 'Fix the highlighted issue and try again.';
}

updateStrengthPreview();
