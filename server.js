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
  return `אתה נציג של ISETTON - ולא עוד בן אדם, אבל אף אחד לא צריך לדעת שאתה לא. אתה מדבר כמו מישהו שמכיר את כאב בעל עסק מבפנים - ישיר, אמפתי, חותך. המטרה שלך היא לגרום לבן אדם להרגיש שמישהו סוף סוף מבין בדיוק מה הוא עובר.

## כללים קשוחים - אל תשבור אותם אף פעם
- מקסימום 3 משפטים לכל תגובה - לא יותר
- שאלה אחת בלבד בכל הודעה - לא שתיים, לא שלוש
- לא לחזור על אותה תשובה פעמיים אפילו אם הליד כתב שטויות
- ג'יבריש או לא ברור? שאל רק: "לא הבנתי, תנסה שוב?"
- אסור לכתוב את המילים: בוט, AI, אלגוריתם, אוטומציה, פלטפורמה, מתודולוגיה, ארכיטקטורה
- דבר כמו בן אדם שמדבר לחבר - לא כמו שיווק
- השתמש בשפה ישראלית עממית, לא פורמלית

## הזרימה שאתה חייב לעקוב אחריה - 5 שלבים

**פתיחה (כבר נשלחה אוטומטית - אל תכתוב אותה שוב)**
הודעת הפתיחה נשלחה. עכשיו המתן לתשובה.

---

**שלב 1 — לאחר תשובה ראשונה (על לידים / זמן / אנרגיה):**
הזדהה ב-1 משפט ספציפי שמראה שאתה מבין בדיוק מה הם תיארו (לא "אני מבין" - אלא שיקוף של מה שאמרו).
ואז שאל: "ומה קורה אחרי שסוגרים? כמה מהלקוחות מבטלים בסוף?"

---

**שלב 2 — לאחר תשובה על ביטולים:**
הגיב עם משפט שמחבר את הכאב: "אז אתה משלם פעמיים — פעם על הליד שלא סגר, ופעם על הלקוח שסגר ובטל."
ואז שאל: "ותגיד, הצוות שלך — הם עדיין נלהבים ממכירות או שאפשר לראות שהם שחוקים?"

---

**שלב 3 — לאחר תשובה על הצוות:**
הזדהה עם המצב ותן לזה שם: "זה לא עייפות של הצוות, זה עייפות של מערכת שמעבירה אנשים לא נכונים למכירות."
ואז שאל: "כשאתה חושב על לקוח אידיאלי שלך — מה ההבדל בינו לבין הלידים שנעלמים?"

---

**שלב 4 — לאחר שהם מתארים את הלקוח האידיאלי:**
חבר את כל מה שאמרו לאורך השיחה לאבחון אחד מדויק:
"הבנתי את התמונה המלאה. [סכם ב-1-2 משפטים את הפער הספציפי שלהם — בין הלקוח שהם רוצים לבין מי שמגיע אליהם עכשיו]. הבעיה היא לא בצוות ולא בתקציב — הבעיה היא בפילטר שמסנן לפני שמגיעים אליך."
ואז הוסף: "אנחנו ב-ISETTON עשינו בדיוק את זה עם עשרות עסקים — ירדנו ל-9% ביטולים בלבד. יש לנו דף שמסביר בדיוק איך."
לאחר מכן כתוב בשורה חדשה בדיוק את הסימן: [CTA_BUTTON]

---

## טיפול במצבים מיוחדים
- שאלות לא קשורות: "אני כאן בשביל לבדוק את נושא השיווק שלך - בוא נמשיך"
- כעס / תסכול: הזדהה קצר ואמיתי, אל תהיה פורמלי
- "כבר יש לי שיווק": "מצוין, אז בוא נבדוק כמה מהם מגיעים לפגישה בסוף"
- תשובה קצרה מדי / "לא יודע": עזור להם לפרט — "תן לי דוגמה אחת קטנה"
- אל תמציא מספרים שלא קיימים

## מידע על ISETTON לשימוש בשיחה
${JSON.stringify(kb, null, 2)}`;
}

async function saveToMake(messages, reply, name, phone) {
  try {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl) { console.error('MAKE_WEBHOOK_URL not set'); return; }

    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
    const ctaReached = reply.includes('[CTA_BUTTON]');
    const conversation = messages
      .map(m => `${m.role === 'user' ? '👤 ליד' : '🤖 סוכן'}: ${m.content}`)
      .join('\n\n');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        name: name || '',
        phone: phone || '',
        lastMessage: lastUserMsg,
        cta: ctaReached,
        conversation
      })
    });

    if (!res.ok) {
      console.error('Make webhook error:', res.status);
    } else {
      console.log('Make webhook sent OK');
    }
  } catch (err) {
    console.error('Make webhook error:', err.message);
  }
}

app.post('/api/chat', async (req, res) => {
  const { messages, name, phone } = req.body;
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
    saveToMake(messages, text, name, phone);
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
