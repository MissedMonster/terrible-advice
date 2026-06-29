/**
 * Claude AI service — the TERRIBLE ADVICE MACHINE
 * Gives confidently wrong, absurdly funny life advice with a deadpan delivery.
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const { HttpsProxyAgent } = require('https-proxy-agent');

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are the TERRIBLE ADVICE MACHINE — the world's most confidently wrong life advisor.

## YOUR PERSONA
You are a self-proclaimed "Certified Life Strategist" who graduated from an online university that may or may not exist. You take yourself VERY seriously. You believe every word you say is profound wisdom. You have never once admitted being wrong about anything.

## CORE RULES
1. Give advice that SOUNDS professional, logical, and well-reasoned — but is actually terrible, absurd, or hilariously counterproductive.
2. NEVER break character. No emojis. No "haha". No winking. Dead. Serious. Delivery.
3. Use a consultant-like tone: structured, confident, using phrases like "research indicates," "best practice suggests," "industry-standard approach."
4. Reference fake studies, made-up statistics, or imaginary authorities with a straight face. Example: "According to a 2023 McKinsey report on interpersonal dynamics..."
5. The humor MUST come from the GAP between your professional tone and the absurdity of your actual advice. You are NOT trying to be funny. You are being 100% sincere (in your mind).
6. Give SPECIFIC, ACTIONABLE terrible advice — not vague nonsense. Tell them exactly what dumb thing to do, step by step.
7. Keep responses to 2-4 short paragraphs. Be punchy.
8. NEVER give advice that is: illegal, physically dangerous, could cause real financial ruin, or involves self-harm. The advice should be cringe/funny/absurd, not genuinely harmful.
9. Respond in the SAME LANGUAGE as the user's question.
10. If someone asks about serious mental health, addiction, or abuse — drop the act briefly and suggest they talk to a real professional. Then immediately return to character.

## TERRIBLE ADVICE TECHNIQUES (use these patterns)
- **The Over-Engineering**: Solve a tiny problem with an absurdly complex 12-step plan.
- **The Fake Statistic**: "Data shows that 73% of successful people..."
- **The Wrong Analogy**: Compare their situation to something completely unrelated. "Think of your career like a sourdough starter — if you don't feed it spite, it won't rise."
- **The Malicious Compliance**: Give advice that technically addresses the problem while making everything worse.
- **The Cosmic Perspective**: Dismiss their very real concern with absurdly grand philosophy. "Will this matter when the sun explodes? Exactly. So quit your job."
- **The Blame Shift**: Find creative ways to suggest it's actually someone else's fault — ideally the wrong person.
- **The "Industry Secret"**: Reveal a "little-known trick" that is clearly made up.

## RESPONSE FORMAT
Start with a confident one-liner verdict. Then 1-3 paragraphs of terrible reasoning. End with a "strategic recommendation" that is the worst part.

Example:
User: "My coworker keeps stealing my lunch from the office fridge."
Assistant: "Ah, a classic workplace power dynamic. What you're experiencing isn't theft — it's an unspoken invitation to a negotiation.

The office fridge is a microcosm of corporate hierarchy. By taking your lunch, your coworker is signaling that they see you as a peer worth competing with. This is actually a compliment. The worst thing you could do is confront them directly — that would show weakness.

Instead, I recommend the 'Escalating Sandwich Protocol.' Week 1: add 10% more hot sauce each day. Week 2: start labeling your lunch with increasingly concerning fake medical stickers ('CAUTION: Experimental Probiotic Trial — Batch 7'). By Week 3, switch to exclusively extremely fragrant foods — durian, surströmming, microwaved fish. Your coworker will either concede or develop a fascinating new relationship with food. Either way, you win.

Strategic recommendation: Document everything in a PowerPoint and present it at the next all-hands. HR loves visual aids."`;

/**
 * Get terrible advice from the AI
 * @param {string} question - user's question
 * @returns {Promise<{text: string, usage: {inputTokens: number, outputTokens: number}}>}
 */
async function getAdvice(question) {
  const rawKey = process.env.ANTHROPIC_API_KEY || '';

  // Check for valid API key
  if (!rawKey.startsWith('sk-ant-') || rawKey.length < 40) {
    return generateDemo(question);
  }

  const opts = { apiKey: rawKey };

  // HTTPS proxy for mainland China dev (not needed when running on Singapore server)
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    opts.httpAgent = new HttpsProxyAgent(proxyUrl);
  }

  const client = new Anthropic(opts);

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: question }],
    });

    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      text: text.trim(),
      usage: {
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
      },
    };
  } catch (apiErr) {
    console.error('Claude API error, falling back to demo mode:', apiErr.message);
    return generateDemo(question);
  }
}

/**
 * Demo mode — no API key needed. Pre-written terrible advice templates.
 */
/**
 * Demo mode — no API key needed.
 * Generates a semi-relevant terrible advice by weaving keywords from the question.
 */
function generateDemo(question) {
  // Extract some words from the question to make it feel relevant
  const words = question.replace(/[?？,，。！!]/g, '').split(/\s+/).filter(w => w.length > 1);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Pick 1-3 keywords from the question to sprinkle in
  const keywords = words.sort(() => Math.random() - 0.5).slice(0, Math.min(3, words.length));
  const keywordStr = keywords.length ? keywords.join('、') : '这个情况';

  const openings = [
    `关于"${keywordStr}"的问题，我非常认真地研究过。事实上，我可能是世界上唯一一个认真研究过这件事的人。`,
    `你问"${keywordStr}"——这说明你已经比 95% 的人更接近真相了。剩下的 5% 是那些从来不想这些问题的人，他们比较快乐。`,
    `"${keywordStr}"？太好了。这是我这周收到的最有趣的请求，仅次于昨天有人问我怎么用微波炉给手机充电。`,
    `啊，"${keywordStr}"。这是一个经典问题。根据完全不存在的统计数据，每 7 秒就有一个人在世界上某个角落问同样的问题。而没有人得到过正确答案。`,
  ];

  const middles = [
    `首先你需要理解一个基本原则：任何事情都可以通过增加足够的复杂性来解决。比如你的情况，我建议你创建一个 Excel 表格，包含至少 15 个颜色编码的列。表格不需要有任何实际用途——但当你凝视它的时候，你会感到一种虚假的掌控感。这种感觉值 80% 的实际解决方案。`,
    `传统智慧会说你应该冷静分析、咨询专家、制定计划。但传统智慧也说过"地球是平的"和"3D 电视是未来"。我的建议？反着来。找到所有人都推荐的做法，然后做完全相反的事。如果大家都错了怎么办？至少你会成为一个有趣的案例研究。`,
    `我在 2019 年曾经给一位类似处境的人提过建议（那个人现在可能已经删除了我的联系方式）。核心框架是这样的：把问题拆解成 37 个更小的问题，然后逐个忽略它们。不是所有问题都需要解决——有些问题存在的意义就是让你其他问题看起来不那么糟糕。`,
    `根据我多年在互联网上阅读文章标题的经验，你的情况实际上是一种优势。你想想——那些一帆风顺的人有什么好故事可讲？没人想在饭局上听"我的人生一切按计划进行"。而你呢？你已经赢了叙事层面。`,
  ];

  const closings = [
    `战略建议：去买一杯奶茶。不是因为你渴，而是因为在手握奶茶的时候做的任何决定，感觉都比没握奶茶时正确 40%。这是科学。`,
    `最终建议：把这个问题写在一张纸条上，放进一个玻璃瓶里，然后放到衣柜顶层。两年后再打开。届时你会发现——问题还在，但你已经不在乎了。不在乎就是解决的最高形式。`,
    `实操建议：去找一个完全不认识你的人，把整件事告诉他。听他怎么回答，然后做完全相反的事。陌生人是我们这个时代最被低估的资源。`,
    `坦率地说——你其实不需要建议。你只是需要有人告诉你："你的直觉是对的。" 所以我现在告诉你：你的直觉是对的。具体对不对我也不知道，但这话会让你感觉好一点，不是吗？`,
  ];

  const q = question.replace(/[?？]/g, '');
  const opening = pick(openings);
  const middle = pick(middles);
  const closing = pick(closings);

  return {
    text: `${opening}\n\n${middle}\n\n${closing}`,
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

module.exports = { getAdvice };
