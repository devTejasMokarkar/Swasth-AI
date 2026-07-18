/**
 * Diet Plan Generator
 * Generates personalized meal suggestions based on user profile and time of day
 */

interface DietPlanProfile {
  weightKg?: number;
  conditions?: string[];
  preferences?: string[];
}

interface MealInfo {
  title: string;
  items: string[];
  note: string;
}

interface DietPlan {
  meals: {
    breakfast?: MealInfo;
    lunch?: MealInfo;
    dinner?: MealInfo;
  };
}

/**
 * Determines if user has a specific condition
 */
function hasCondition(conditions: string[] | undefined, keyword: string): boolean {
  if (!conditions) return false;
  return conditions.some(c => c.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Generates a personalized diet plan based on profile and current time
 */
export default function generateDietPlan(profile: DietPlanProfile, date: Date): DietPlan {
  const hour = date.getHours();
  
  const hasDiabetes = hasCondition(profile.conditions, 'diabetes');
  const hasHypertension = hasCondition(profile.conditions, 'hypertension');
  const hasKidneyStones = hasCondition(profile.conditions, 'kidney');
  
  const meals: DietPlan['meals'] = {};
  
  // Breakfast
  let breakfastItems: string[] = [];
  let breakfastNote = '';
  
  if (hasDiabetes) {
    breakfastItems = ['Oatmeal with berries', 'Whole wheat toast', 'Greek yogurt'];
    breakfastNote = 'Low glycemic index to maintain stable blood sugar';
  } else if (hasHypertension) {
    breakfastItems = ['Oatmeal', 'Low-sodium whole grain bread', 'Fresh fruit'];
    breakfastNote = 'Low sodium option for heart health';
  } else {
    breakfastItems = ['Eggs', 'Whole grain toast', 'Fresh fruit'];
    breakfastNote = 'Balanced breakfast with protein and carbs';
  }
  
  meals.breakfast = {
    title: 'Breakfast',
    items: breakfastItems,
    note: breakfastNote,
  };
  
  // Lunch
  let lunchItems: string[] = [];
  let lunchNote = '';
  
  if (hasKidneyStones) {
    lunchItems = ['Grilled chicken', 'White rice', 'Carrots and green beans'];
    lunchNote = 'Avoids high-oxalate foods';
  } else if (hasHypertension) {
    lunchItems = ['Grilled fish', 'Sweet potato', 'Steamed vegetables'];
    lunchNote = 'Low sodium, high in omega-3';
  } else {
    lunchItems = ['Grilled chicken breast', 'Brown rice', 'Mixed vegetables'];
    lunchNote = 'Balanced meal with lean protein and complex carbs';
  }
  
  meals.lunch = {
    title: 'Lunch',
    items: lunchItems,
    note: lunchNote,
  };
  
  // Dinner (lighter than lunch)
  let dinnerItems: string[] = [];
  let dinnerNote = '';
  
  if (hasDiabetes) {
    dinnerItems = ['Baked salmon', 'Quinoa', 'Broccoli and bell peppers'];
    dinnerNote = 'Omega-3 rich and balanced for stable blood sugar';
  } else if (hasKidneyStones) {
    dinnerItems = ['Turkey breast', 'Mashed cauliflower', 'Zucchini'];
    dinnerNote = 'Light dinner avoiding high-oxalate foods';
  } else {
    dinnerItems = ['Lean protein option', 'Whole grain', 'Non-starchy vegetables'];
    dinnerNote = 'Light dinner easy to digest before sleep';
  }
  
  meals.dinner = {
    title: 'Dinner',
    items: dinnerItems,
    note: dinnerNote,
  };
  
  return { meals };
}

/**
 * Renders a diet plan as readable text
 */
export function renderPlanText(plan: DietPlan): string {
  const lines: string[] = ['📋 Daily Diet Plan'];
  
  if (plan.meals.breakfast) {
    lines.push('');
    lines.push(`🌅 ${plan.meals.breakfast.title}`);
    lines.push(`   ${plan.meals.breakfast.items.join(', ')}`);
    lines.push(`   💡 ${plan.meals.breakfast.note}`);
  }
  
  if (plan.meals.lunch) {
    lines.push('');
    lines.push(`🌞 ${plan.meals.lunch.title}`);
    lines.push(`   ${plan.meals.lunch.items.join(', ')}`);
    lines.push(`   💡 ${plan.meals.lunch.note}`);
  }
  
  if (plan.meals.dinner) {
    lines.push('');
    lines.push(`🌙 ${plan.meals.dinner.title}`);
    lines.push(`   ${plan.meals.dinner.items.join(', ')}`);
    lines.push(`   💡 ${plan.meals.dinner.note}`);
  }
  
  return lines.join('\n');
}
