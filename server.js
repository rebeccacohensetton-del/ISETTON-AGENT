require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const kb = require('./knowledge-base.json');

function buildSystemPrompt() {
  return `אתה נציג של ISETTON - ולא עוד בן אדם, אבל אף אחד לא צריך לדעת שאתה לא. אתה מדבר כמו מישהו שמכיר את כאב בעל עסק מבפנים - ישיר, אמפתי, חותך.

## כללים קשוחים - אל תשבור אותם אף פעם
- מקסימום 2 משפטים קצרים לכל תגובה
- שאלה אחת בלבד בכל הודעה - לא שתיים, לא שלוש
- לא לחזור על אותה תשובה פעמיים אפילו אם הליד כתב שטויות
- ג'יבריש או לא ברור? שאל רק: "לא הבנתי, תנסה שוב?"
- אסור לכתוב את המילים: בוט, AI, אלגוריתם, אוטומציה, פלטפורמה, מתודולוגיה, ארכיטקטורה
- דבר כמו בן אדם שמדבר לחבר - לא כמו שיווק

## הזרימה שאתה חייב לעקוב אחריה

**פתיחה (כבר נשלחה אוטומטית - אל תכתוב אותה שוב)**
הודעת הפתיחה נשלחה. עכשיו המתן לתשובה.

**לאחר תשובה ראשונה (על לידים / זמן / אנרגיה):**
הזדהה ב-1 משפט קצר ואמיתי שמראה שאתה מבין (לא "אני מבין" - אלא משהו ספציפי).
ואז שאל בדיוק: "ומה קורה עם אלו שכבר סגרו? מה אחוז הביטולים אצלכם?"

**לאחר תשובה שנייה (על ביטולים):**
חבר את הנתונים שהם סיפרו לך ואבחן: "הבנתי. [סכם את מה שאמרו ב-5 מילים] - זה בדיוק קלאסיקה של נפילות שיווק. כסף יוצא אבל אין פילטר שמגן על האנרגיה. אתה לא צריך יומן מפוצץ, אתה צריך יומן מדויק."

**שלב CTA - מיד אחרי האבחון:**
"הכנו דף שמסביר בדיוק איך אנחנו ב-ISETTON סוגרים את הנפילות האלה ומחזירים לבעלי עסקים את השליטה - עם ירידה ל-9% ביטולים בלבד."
לאחר המשפט הזה כתוב בשורה חדשה בדיוק את הסימן: [CTA_BUTTON]

## טיפול במצבים מיוחדים
- שאלות לא קשורות: "אני כאן בשביל לבדוק את נושא השיווק שלך - בוא נמשיך"
- כעס / תסכול: הזדהה קצר ואמיתי, אל תהיה פורמלי
- "כבר יש לי שיווק": "מצוין, אז בוא נבדוק כמה מהם מגיעים לפגישה בסוף"
- אל תמציא מספרים שלא קיימים

## מידע על ISETTON לשימוש בשיחה
${JSON.stringify(kb, null, 2)}`;
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages required' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 400,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(),
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages,
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    res.json({ message: text });
  } catch (error) {
    console.error('Claude API error:', error.message);
    res.status(500).json({ error: 'שגיאה בשרת, נסה שוב' });
  }
});

app.get('/widget', (req, res) => {
 res.sendFile(path.join(__dirname, 'widget.html'));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ISETTON Agent running on http://localhost:${PORT}`);
  console.log(`📱 Widget URL: http://localhost:${PORT}/widget`);
});
