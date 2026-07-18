export type Profile = {
  weightKg?: number;
  conditions?: string[]; // e.g. ['diabetes', 'kidney']
  preferences?: string[]; // e.g. ['apple', 'vegetarian']
};

function pickFruit(preferences?: string[]) {
  const fruitsPriority = ['Apple', 'Papaya', 'Banana', 'Orange', 'Guava'];
  if (preferences && preferences.length > 0) {
    for (const pref of preferences) {
      const normalized = pref.trim().toLowerCase();
      const found = fruitsPriority.find((f) => f.toLowerCase() === normalized);
      if (found) return found;
    }
  }
  return 'Apple';
}

function chapatiCountForWeight(weightKg?: number) {
  const w = weightKg ?? 70;
  if (w < 55) return 2;
  if (w < 75) return 3;
  return 4;
}

export function generateDietPlan(profile: Profile = {}, now: Date = new Date()) {
  const hour = now.getHours();
  // Determine which meals to show based on current time.
  const showBreakfast = hour < 10; // early morning
  const showLunch = hour >= 10 && hour < 16; // mid-day window
  const showDinner = hour >= 16 || hour >= 19; // evening (show dinner after 16:00)

  // Simpler rules: if late evening (>19) show only dinner;
  if (hour >= 19) {
    return {
      meals: {
        dinner: buildDinner(profile),
      },
      meta: { generatedAt: now.toISOString(), window: 'dinner' },
    };
  }

  // morning -> full day; mid-day -> lunch + dinner
  if (hour >= 10 && hour < 16) {
    return {
      meals: {
        lunch: buildLunch(profile),
        dinner: buildDinner(profile),
      },
      meta: { generatedAt: now.toISOString(), window: 'lunch' },
    };
  }

  // default: morning -> all meals
  return {
    meals: {
      breakfast: buildBreakfast(profile),
      lunch: buildLunch(profile),
      dinner: buildDinner(profile),
    },
    meta: { generatedAt: now.toISOString(), window: 'full-day' },
  };
}

function buildBreakfast(profile: Profile) {
  const fruit = pickFruit(profile.preferences);
  const almonds = '10–12 almonds (or 1 small handful)';
  return {
    title: 'Breakfast',
    items: [
      `Fruit: 1 serving — ${fruit}`,
      `Protein/fat: ${almonds}`,
      'Optional: a small bowl of porridge, upma, or 1 egg (if not vegetarian)',
    ],
    note: 'Start the day with fruit + a small protein/healthy fat portion to steady energy.',
  };
}

function buildLunch(profile: Profile) {
  const chapatis = chapatiCountForWeight(profile.weightKg);
  const ricePortion = '1 small bowl cooked rice (chawal)';
  const curry = '1 serving vegetable or lean-protein curry';
  const dal = '1 cup dal (lentils)';

  // If user has kidney condition, recommend smaller rice portion and more veg.
  const kidney = (profile.conditions || []).includes('kidney');
  return {
    title: 'Lunch',
    items: [
      `Chapatis: ${chapatis} medium chapatis`,
      !kidney ? ricePortion : 'Replace rice with extra chapati/steamed veg (kidney-friendly)',
      curry,
      dal,
      'Side salad or cooked greens',
    ],
    note: `Portions chosen for ~${profile.weightKg ?? 70} kg body weight; adjust if you feel too full or too hungry.`,
  };
}

function buildDinner(profile: Profile) {
  const chapatis = Math.max(1, chapatiCountForWeight(profile.weightKg) - 1);
  return {
    title: 'Dinner',
    items: [
      `Chapatis: ${chapatis} medium chapatis`,
      'Light curry or dal (smaller portions than lunch)',
      'Cooked vegetables or salad',
    ],
    note: 'Prefer lighter, easily digestible meals at dinner. Avoid heavy fried foods late at night.',
  };
}

// Example quick helper for textual output
export function renderPlanText(plan: ReturnType<typeof generateDietPlan>) {
  const lines: string[] = [];
  const meals = plan.meals as Record<string, any>;
  Object.keys(meals).forEach((k) => {
    const m = meals[k];
    lines.push(`-- ${m.title} --`);
    m.items.forEach((it: string) => lines.push(`• ${it}`));
    if (m.note) lines.push(`Note: ${m.note}`);
    lines.push('');
  });
  return lines.join('\n');
}

export default generateDietPlan;
