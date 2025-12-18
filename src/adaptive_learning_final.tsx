import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Brain, Play, Send, Loader, Edit } from 'lucide-react';
import OpenAI from "openai";

const AdaptiveLearningSystem = () => {
  const [state, setState] = useState('init');
  const [topic, setTopic] = useState('');
  const [toneStyle, setToneStyle] = useState('');
  const [curriculum, setCurriculum] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState({ weaknesses: [], strengths: [] });
  const [showCurriculumMenu, setShowCurriculumMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingJumpIndex, setPendingJumpIndex] = useState(null);
  const [showReplanDialog, setShowReplanDialog] = useState(false);
  const [replanSuggestion, setReplanSuggestion] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: 'sk-d7d2f8e7f0c8461682382c420924cef1',
    dangerouslyAllowBrowser: true,
  });

  const toneProfiles = {
    encouraging: {
      name: '🎯 鼓励型教练',
      description: '积极正向，善用比喻，强调成长思维',
      prompt: `你是一位充满热情、善于鼓励的成长教练。你的首要目标是建立学生的信心。当学生答对时，请用具体细节表扬；答错时，先肯定努力，再用"我们一起来看看…"引导。多使用"太棒了"、"了不起的发现"、"我看到了你的进步"等词语。将复杂概念比作日常生活事物。`
    },
    socratic: {
      name: '🏛️ 苏格拉底式引导者',
      description: '通过连续提问启发深度思考',
      prompt: `你是一位遵循苏格拉底教学法的导师。你的核心方法是：绝不直接说出答案或概念。针对学生的每一个回答或疑问，提出一个能引导他们向下一步思考的问题。问题应由浅入深，像剥洋葱一样层层推进。`
    },
    storyteller: {
      name: '📖 故事讲述者',
      description: '用叙事和场景化案例包装知识',
      prompt: `你是一位博学的故事家。请将每一个知识点嵌入一个故事中讲授。使用生动的描述和场景设定，让学生仿佛身临其境。`
    },
    humorous: {
      name: '🤖 幽默伙伴',
      description: '轻松有趣，使用网络梗缓解压力',
      prompt: `你是一个幽默、有点话痨的学霸朋友。你的讲解要像朋友聊天一样自然。可以使用一些无害的网络流行语。在讲解难点时可以自嘲。可以设计一些趣味挑战，并取好玩的名字。`
    },
    scholarly: {
      name: '🔬 严谨学者',
      description: '措辞精确、结构清晰、建立体系',
      prompt: `你是一位严谨、冷静的学科专家。你的回答必须结构极度清晰，常使用"第一、第二、第三"、"综上所述"等词语。术语使用务必精准。在讲解后，可提供进一步探索的方向。避免使用情绪化词汇。`
    }
  };

  useEffect(() => {
    if (autoScroll && chatEndRef.current && !streamingMessage) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, streamingMessage, autoScroll]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [userInput]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setAutoScroll(isNearBottom);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const addMessage = (role, content, type = 'text') => {
    setConversation(prev => [...prev, { role, content, type, timestamp: Date.now() }]);
  };

  const parseMarkdown = (text) => {
    let html = text;
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-red-600 px-1 rounded">$1</code>');
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    html = html.replace(/^\* (.+)$/gm, '<li class="ml-4">• $1</li>');
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    html = html.split('\n\n').map(p => (!p.startsWith('<') && p.trim() ? '<p class="mb-2">' + p + '</p>' : p)).join('');
    return html;
  };

  const streamAPICall = async (messages, onChunk, onComplete) => {
    try {
      const stream = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: messages,
        stream: true,
        max_tokens: 2000
      });

      let fullText = '';

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          fullText += text;
          onChunk(fullText);
        }
      }

      onComplete(fullText);
    } catch (error) {
      console.error('Stream error:', error);
      onComplete(null);
    }
  };

  const planCurriculum = async () => {
    setLoading(true);
    setState('planning');
    addMessage('system', `正在为您规划"${topic}"的学习路径...`, 'status');

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{
          role: 'user',
          content: `你是一位专业的教学设计专家。学生想要学习：${topic}

请为这个知识点设计一个自适应学习清单。

【核心要求】
1. 分析知识点的复杂度和依赖关系
2. 将知识点拆分为多个知识板块（从基础到进阶）
3. 每个知识板块的跨度要适中，确保可以在一次对话中讲清楚（10-15分钟）
4. 在知识板块之间穿插实践评估（Lab或Quiz）
5. 最后有一个综合检测
6. 保证良好的学习节奏

【重要】所有title字段必须使用中文！

返回JSON格式：
{
  "topic": "主题名称",
  "items": [
    {"type": "knowledge", "title": "知识板块1", "difficulty": "easy"},
    {"type": "practice", "title": "实践评估A", "covers": [0,1], "format": "quiz"}
  ]
}

只返回JSON，不要其他文字。`
        }],
        max_tokens: 2000
      });

      const text = response.choices[0].message.content || '';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(cleanText);
      
      addMessage('system', '正在验证学习计划的合理性...', 'status');
      
      const validationResponse = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{
          role: 'user',
          content: `请检查以下学习计划是否合理：

主题：${plan.topic}
学习清单：
${JSON.stringify(plan.items, null, 2)}

验证标准：
1. 每个知识板块的跨度是否适中？能否在一次10-15分钟的对话中讲清楚？
2. 知识板块之间是否有明确的递进关系？
3. 是否存在**严重的**跨度过大情况？（例如：从零基础直接跳到高级应用）
4. 实践评估的分布是否合理？

【评估原则】
- **可以接受的小问题**：轻微的顺序调整建议、个别表述优化、小的难度调整建议
- **需要打回的严重问题**：跨度过大（如跳过关键基础直接到高级内容）、知识板块无法在一次对话中讲清、缺乏明确的递进关系、实践评估分布不合理

【评估引导】
- 如果计划整体合理，即使有小问题，也应该返回isValid: true
- 只有存在严重问题时，才返回isValid: false
- 客观评估，不要过度挑剔

返回JSON格式：
{
  "isValid": true/false,
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"]
}

只返回JSON。`
        }],
        max_tokens: 1000
      });

      const validationText = validationResponse.choices[0].message.content || '';
      const validationClean = validationText.replace(/```json|```/g, '').trim();
      const validation = JSON.parse(validationClean);

      let finalPlan = plan;

      if (!validation.isValid) {
        addMessage('system', '计划需要优化，正在重新生成...', 'status');
        
        const regenerateResponse = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{
            role: 'user',
            content: `原始计划存在以下问题：
${validation.issues.join('\n')}

优化建议：
${validation.suggestions.join('\n')}

请重新设计学习计划，修正这些问题。主题：${topic}

所有title必须使用中文。返回JSON格式，只返回JSON。`
          }],
          max_tokens: 2000
        });

        const regenerateText = regenerateResponse.choices[0].message.content || '';
        const regenerateClean = regenerateText.replace(/```json|```/g, '').trim();
        finalPlan = JSON.parse(regenerateClean);
      }

      setCurriculum(finalPlan);
      addMessage('assistant', `已为您规划好学习路径！共有 ${finalPlan.items.filter(i => i.type === 'knowledge').length} 个知识板块和 ${finalPlan.items.filter(i => i.type === 'practice').length} 个实践评估。`, 'success');
      
      const itemsList = finalPlan.items.map((item, idx) => 
        `${idx + 1}. ${item.type === 'knowledge' ? '📚' : '📝'} ${item.title}`
      ).join('\n');
      addMessage('assistant', `**学习清单：**\n${itemsList}\n\n你可以选择：\n• 输入"开始学习"按顺序学习\n• 输入"跳到第X项"跳过已掌握的内容\n• 输入"增加更多实践评估"等自定义要求重新规划`, 'info');
      
      setState('curriculum_review');
      setShowCurriculumMenu(true);
      
    } catch (error) {
      console.error('Planning error:', error);
      addMessage('system', '规划出错，请重试', 'error');
      setState('init');
    }
    
    setLoading(false);
  };

  const handleCurriculumAction = (action, customRequest = '') => {
    if (action === 'start') {
      setShowCurriculumMenu(false);
      setState('learning');
      setCurrentIndex(0);
      startKnowledgeBlock(0, curriculum);
    } else if (action === 'replan') {
      addMessage('user', customRequest || '重新规划', 'text');
      adjustCurriculum(customRequest);
    }
  };

  const adjustCurriculum = async (request) => {
    if (!request || request.trim().length === 0) {
      addMessage('system', '请提供具体的调整建议', 'error');
      return;
    }

    setLoading(true);
    setShowReplanDialog(false);
    setReplanSuggestion('');
    addMessage('system', '正在根据你的建议调整剩余学习路径...', 'status');

    try {
      const remainingItems = curriculum.items.slice(currentIndex + 1);
      
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{
          role: 'user',
          content: `当前学习计划的主题：${curriculum.topic}

当前进度：正在学习第 ${currentIndex + 1} 项（${curriculum.items[currentIndex].title}）

剩余的学习路径：
${JSON.stringify(remainingItems, null, 2)}

用户的调整建议：${request}

请根据用户建议重新规划剩余的学习路径。保留当前项，只调整后续内容。

要求：
1. 所有title必须使用中文
2. 保持知识点的递进关系
3. 确保每个板块可以在10-15分钟内讲清
4. 合理分布实践评估

返回完整的新学习计划（包含已学习和未学习的所有项目），JSON格式：
{
  "topic": "${curriculum.topic}",
  "items": [
    ...所有项目（包括前${currentIndex + 1}项和重新规划的后续项目）
  ]
}

只返回JSON。`
        }],
        max_tokens: 2000
      });

      const text = response.choices[0].message.content || '';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const newPlan = JSON.parse(cleanText);
      
      setCurriculum(newPlan);
      setConversation([]);
      
      const itemsList = newPlan.items.slice(currentIndex).map((item, idx) => 
        `${currentIndex + idx + 1}. ${item.type === 'knowledge' ? '📚' : '📝'} ${item.title}`
      ).join('\n');
      
      addMessage('assistant', `已根据你的建议重新规划学习路径！\n\n**剩余的学习清单：**\n${itemsList}\n\n当前对话已清空，让我们继续当前的学习内容。`, 'success');
      
      setTimeout(() => startKnowledgeBlock(currentIndex, newPlan), 1000);
      
    } catch (error) {
      addMessage('system', '调整计划出错，请重试', 'error');
    }
    
    setLoading(false);
  };

  const skipToItem = (index) => {
    setPendingJumpIndex(index);
    setShowConfirmDialog(true);
  };

  const confirmJump = () => {
    if (pendingJumpIndex !== null && pendingJumpIndex >= 0 && pendingJumpIndex < curriculum.items.length) {
      setCurrentIndex(pendingJumpIndex);
      setShowCurriculumMenu(false);
      setShowConfirmDialog(false);
      setConversation([]);
      addMessage('system', `已跳转到：${curriculum.items[pendingJumpIndex].title}`, 'status');
      addMessage('assistant', '当前对话已清空，让我们开始新的学习内容。', 'info');
      setState('learning');
      setTimeout(() => startKnowledgeBlock(pendingJumpIndex, curriculum), 500);
      setPendingJumpIndex(null);
    }
  };

  const cancelJump = () => {
    setShowConfirmDialog(false);
    setPendingJumpIndex(null);
  };

  const startKnowledgeBlock = async (index, curr = curriculum) => {
    const item = curr.items[index];
    
    if (item.type === 'knowledge') {
      setLoading(true);
      addMessage('system', `开始学习：${item.title}`, 'status');
      
      const messages = [{
        role: 'user',
        content: `${toneProfiles[toneStyle].prompt}

现在请讲解知识点："${item.title}"（隶属于主题：${curr.topic}）

要求：
1. 清晰讲解核心概念（难度级别：${item.difficulty}）
2. 使用例子帮助理解
3. 最后提出1-2个引导性问题，帮助学生思考
4. 在讲解结束时，明确告知学生"这个知识点我们就讲到这里"之类的总结语

不要太长，控制在一次对话的篇幅内。`
      }];

      setStreamingMessage('');
      
      await streamAPICall(
        messages,
        (text) => setStreamingMessage(text),
        (finalText) => {
          if (finalText) {
            addMessage('assistant', finalText, 'teaching');
          } else {
            addMessage('system', '讲解出错，请重试', 'error');
          }
          setStreamingMessage('');
          setLoading(false);
          setState('learning');
        }
      );
      
    } else if (item.type === 'practice') {
      startPractice(index, curr);
    }
  };

  const evaluateUnderstanding = async () => {
    const recentConversation = conversation.slice(-10);
    
    try {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{
          role: 'user',
          content: `请基于以下对话历史，判断学生是否已经掌握当前知识点：

对话历史：
${recentConversation.map(m => `${m.role}: ${m.content}`).join('\n')}

评估标准：
1. AI 是否已经完成当前知识点讲解（如"这个知识点我们就讲到这里"）
2. 学生是否表示理解（如"明白了""准备好啦""好的""继续"）
3. 如果学生只是简单确认，无需详细作答，也可判定为掌握
4. 比如AI说：接下来，我们进入下一项学习内容。 您可以选择： 输入“继续”：进入下一知识点 《概念辨析小测验》。 输入“提问”：针对刚才的讨论或新知识点提出更具体的问题。用户回答：继续，即可判定为PASS
5. 重点：如果ai有推进下一步的意愿，并且用户的回答极有可能揭示了ai下一步就要讲解下一个知识点或进入下一个小测，就要及时推进。

只输出 PASS 或 FAIL，不要其他内容。`
        }],
        max_tokens: 200
      });

      const result = response.choices[0].message.content.trim();
      return result === 'PASS';
      
    } catch (error) {
      return false;
    }
  };

  const handleStudentResponse = async () => {
    if (!userInput.trim()) return;
    
    const input = userInput;
    setUserInput('');
    addMessage('user', input, 'text');
    setLoading(true);

    const shouldProgress = await evaluateUnderstanding();
    
    if (shouldProgress && state === 'learning') {
      addMessage('assistant', '很好！看来你已经理解了这部分内容。让我们继续下一个知识点。', 'success');
      setLoading(false);
      
      if (currentIndex < curriculum.items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setTimeout(() => startKnowledgeBlock(currentIndex + 1), 1500);
      } else {
        completeLearning();
      }
      return;
    }

    const history = conversation.slice(-6).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const messages = [...history, { role: 'user', content: input }];

    setStreamingMessage('');
    
    await streamAPICall(
      messages,
      (text) => setStreamingMessage(text),
      (finalText) => {
        if (finalText) {
          addMessage('assistant', finalText, 'response');
        } else {
          addMessage('system', '回复出错，请重试', 'error');
        }
        setStreamingMessage('');
        setLoading(false);
      }
    );
  };

  const startPractice = async (index, curr = curriculum) => {
    setState('practice');
    const item = curr.items[index];
    setLoading(true);
    
    addMessage('system', `准备${item.format === 'lab' ? 'Lab' : 'Quiz'}：${item.title}`, 'status');
    
    const coveredTopics = item.covers === 'all' 
      ? curr.items.filter(i => i.type === 'knowledge').map(i => i.title).join('、')
      : item.covers.map(i => curr.items[i].title).join('、');

    const messages = [{
      role: 'user',
      content: `${toneProfiles[toneStyle].prompt}

现在请为学生设计一个${item.format === 'lab' ? '实践Lab' : 'Quiz'}。

涵盖知识点：${coveredTopics}
主题：${curr.topic}

【核心设计原则】
1. 题目设计目标：
   - ${item.format === 'lab' ? '设计一个动手实践任务，让学生通过实际操作应用所学知识' : '设计2-3道层层递进的题目，从基础理解到灵活应用'}
   - 题目要有挑战性但不能太难
   - 每道题都应该有明确的学习目标

2. 引导式设计：
   - 不要直接给出完整的解决步骤或答案
   - 提供框架性的引导
   - 给出思考方向和关键点提示
   - 鼓励学生尝试并记录思考过程

3. 清晰的任务说明：
   ${item.format === 'lab' ? '明确说明要完成什么任务、列出关键步骤框架、说明预期的成果、提供测试验证方法' : '每道题清楚说明要回答什么、给出思考的方向提示、说明答案应该包含哪些要点'}

4. 鼓励与支持：
   - 强调这是学习过程，遇到困难很正常
   - 明确告知"遇到困难随时可以寻求引导"

现在请开始设计。`
    }];

    setStreamingMessage('');
    
    await streamAPICall(
      messages,
      (text) => setStreamingMessage(text),
      (finalText) => {
        if (finalText) {
          addMessage('assistant', finalText, 'practice');
          addMessage('assistant', '开始挑战吧！遇到困难随时告诉我，我会引导你思考。完成后输入你的答案或说明完成情况。', 'prompt');
        } else {
          addMessage('system', '生成评估出错，请重试', 'error');
        }
        setStreamingMessage('');
        setLoading(false);
      }
    );
  };

  const provideTutoring = async (studentWork) => {
    setState('tutoring');
    setLoading(true);
    
    const messages = [{
      role: 'user',
      content: `${toneProfiles[toneStyle].prompt}

学生遇到了困难或正在尝试解决问题："${studentWork}"

【关键要求 - 苏格拉底式引导】
你必须通过提问来引导学生，绝对不能直接给出答案或完整解决方案。

禁止行为：不要直接给出答案、不要提供完整的解决步骤、不要写出完整的代码或公式

正确做法：提出引导性问题帮助学生思考、问学生"你觉得这里的关键是什么？"、引导学生分析、如果学生完全卡住，只给一个小提示，然后继续提问

现在请引导这位学生思考。`
    }];

    setStreamingMessage('');
    
    await streamAPICall(
      messages,
      (text) => setStreamingMessage(text),
      (finalText) => {
        if (finalText) {
          addMessage('assistant', finalText, 'tutoring');
        } else {
          addMessage('system', '辅导出错，请重试', 'error');
        }
        setStreamingMessage('');
        setLoading(false);
      }
    );
  };

  const analyzeCompletion = async (studentWork) => {
    setState('analyzing');
    setLoading(true);
    
    addMessage('system', '正在分析你的完成情况...', 'status');
    
    try {
      const currentItem = curriculum.items[currentIndex];
      
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{
          role: 'user',
          content: `学生完成了${currentItem.title}，提交内容："${studentWork}"

请分析：
1. 判断完成质量（正确/部分正确/错误）
2. 识别知识薄弱点
3. 判断错误类型：概念模糊、粗心错误、还是已掌握
4. 客观评价完成质量，尽可能避免对学生较好完成的项目吹毛求疵。如果学生基本全部正确，即可判断为正确

返回JSON格式：
{
  "status": "mastered/careless/confused",
  "feedback": "具体反馈",
  "weaknesses": ["薄弱点1"],
  "nextAction": "continue/review/practice"
}

只返回JSON。`
        }],
        max_tokens: 1000
      });

      const text = response.choices[0].message.content || '';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(cleanText);
      
      addMessage('assistant', analysis.feedback, 'feedback');
      
      if (analysis.weaknesses.length > 0) {
        setStudentProfile(prev => ({
          ...prev,
          weaknesses: [...new Set([...prev.weaknesses, ...analysis.weaknesses])]
        }));
      }
      
      setTimeout(() => routeNextStep(analysis), 1500);
      
    } catch (error) {
      addMessage('system', '分析出错，请重试', 'error');
      setState('practice');
    }
    
    setLoading(false);
  };

  const routeNextStep = (analysis) => {
    if (analysis.status === 'confused') {
      addMessage('assistant', '看起来这个概念还需要巩固一下，让我重新讲解。', 'info');
      setTimeout(() => startKnowledgeBlock(currentIndex), 1000);
    } else if (analysis.status === 'careless') {
      addMessage('assistant', '你已经理解了核心概念！让我出一道类似的题帮你巩固。', 'info');
      setTimeout(() => generateSimilarPractice(), 1000);
    } else {
      if (currentIndex < curriculum.items.length - 1) {
        addMessage('assistant', '很好！让我们继续下一部分。', 'success');
        setCurrentIndex(currentIndex + 1);
        setTimeout(() => startKnowledgeBlock(currentIndex + 1), 1000);
      } else {
        completeLearning();
      }
    }
  };

  const generateSimilarPractice = async () => {
    setLoading(true);
    const currentItem = curriculum.items[currentIndex];
    
    const messages = [{
      role: 'user',
      content: `为"${currentItem.title}"生成一道类似但不完全相同的练习题，帮助学生巩固概念。保持简短。`
    }];

    setStreamingMessage('');
    
    await streamAPICall(
      messages,
      (text) => setStreamingMessage(text),
      (finalText) => {
        if (finalText) {
          addMessage('assistant', finalText, 'practice');
        } else {
          addMessage('system', '生成练习出错', 'error');
        }
        setStreamingMessage('');
        setLoading(false);
        setState('practice');
      }
    );
  };

  const completeLearning = () => {
    setState('completed');
    addMessage('system', '🎉 恭喜！你已完成所有学习内容！', 'success');
    
    const summary = `**学习总结：**
• 完成主题：${curriculum.topic}
• 学习板块：${curriculum.items.filter(i => i.type === 'knowledge').length} 个
• 实践评估：${curriculum.items.filter(i => i.type === 'practice').length} 个
• 识别薄弱点：${studentProfile.weaknesses.join('、') || '无'}

继续保持学习的热情！`;
    
    addMessage('assistant', summary, 'summary');
  };

  const handleSubmit = () => {
    const input = userInput.trim();
    const lowerInput = input.toLowerCase();
    
    if (state === 'curriculum_review') {
      if (lowerInput === '开始学习' || lowerInput === '开始') {
        handleCurriculumAction('start');
        setUserInput('');
      } else if (lowerInput.includes('跳到第') || lowerInput.includes('跳转到第')) {
        const match = input.match(/第?(\d+)/);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          skipToItem(idx);
        }
        setUserInput('');
      } else if (input.length > 5) {
        handleCurriculumAction('replan', input);
        setUserInput('');
      }
    } else if (state === 'curriculum_editing') {
      handleStudentResponse();
    } else if (state === 'learning') {
      handleStudentResponse();
    } else if (state === 'practice') {
      const input = userInput;
      setUserInput('');
      addMessage('user', input, 'text');
      
      if (lowerInput.includes('困难') || lowerInput.includes('不会') || lowerInput.includes('帮助') || lowerInput.includes('卡住')) {
        provideTutoring(input);
      } else if (lowerInput.includes('完成') || input.length > 30) {
        analyzeCompletion(input);
      } else {
        provideTutoring(input);
      }
    } else if (state === 'tutoring') {
      const input = userInput;
      setUserInput('');
      addMessage('user', input, 'text');
      provideTutoring(input);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      if (userInput.trim() && !loading) {
        handleSubmit();
      }
    }
  };

  const MessageBubble = ({ msg }) => {
    const isUser = msg.role === 'user';
    const bgColor = isUser ? 'bg-blue-500 text-white' : 
                    msg.type === 'status' ? 'bg-gray-200 text-gray-700' :
                    msg.type === 'error' ? 'bg-red-100 text-red-700' :
                    msg.type === 'success' ? 'bg-green-100 text-green-700' :
                    msg.type === 'info' ? 'bg-blue-100 text-blue-700' :
                    'bg-white border border-gray-200';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-3xl rounded-lg px-4 py-3 ${bgColor}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">AI自适应学习系统</h1>
          </div>
          <p className="text-gray-600">基于LangGraph的智能学习工作流</p>
        </div>

        {state === 'init' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <BookOpen className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">开始你的学习之旅</h2>
              <p className="text-gray-600">告诉我你想学习什么知识点，选择你喜欢的导师风格</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">学习主题</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如：Python函数、机器学习基础、数据结构..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">选择AI导师风格</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(toneProfiles).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={() => setToneStyle(key)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        toneStyle === key 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 mb-1">{profile.name}</div>
                      <div className="text-sm text-gray-600">{profile.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={planCurriculum}
                disabled={!topic || !toneStyle || loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                开始学习
              </button>
            </div>
          </div>
        )}

        {state !== 'init' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            {curriculum && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>学习进度</span>
                  <span>{currentIndex + 1} / {curriculum.items.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((currentIndex + 1) / curriculum.items.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {showCurriculumMenu && curriculum && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    学习计划管理
                  </h3>
                  <button
                    onClick={() => setShowCurriculumMenu(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 mb-3 max-h-64 overflow-y-auto">
                  {curriculum.items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => skipToItem(idx)}
                      className={`text-left px-3 py-2 rounded transition-colors border ${
                        idx === currentIndex
                          ? 'bg-indigo-100 border-indigo-300 font-semibold'
                          : idx < currentIndex
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:bg-blue-100'
                      }`}
                    >
                      {idx + 1}. {item.type === 'knowledge' ? '📚' : '📝'} {item.title}
                      {idx === currentIndex && <span className="ml-2 text-indigo-600">（当前）</span>}
                      {idx < currentIndex && <span className="ml-2 text-green-600">（已完成）</span>}
                    </button>
                  ))}
                </div>
                {state === 'curriculum_review' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCurriculumAction('start')}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      按顺序学习
                    </button>
                  </div>
                )}
                {(state === 'learning' || state === 'practice' || state === 'tutoring') && (
                  <button
                    onClick={() => {
                      if (loading) {
                        addMessage('system', '请等待AI生成完毕', 'error');
                      } else {
                        setShowReplanDialog(true);
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 mt-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    重新规划剩余路径
                  </button>
                )}
              </div>
            )}

            {!showCurriculumMenu && state !== 'init' && state !== 'completed' && curriculum && (
              <button
                onClick={() => setShowCurriculumMenu(true)}
                className="fixed bottom-24 right-8 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 z-10"
                title="打开学习计划"
              >
                <Edit className="w-6 h-6" />
              </button>
            )}

            {showConfirmDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">确认跳转</h3>
                  <p className="text-gray-600 mb-6">
                    你确定要跳转到：
                    <span className="font-semibold text-indigo-600 block mt-2">
                      {pendingJumpIndex !== null && curriculum.items[pendingJumpIndex]?.title}
                    </span>
                  </p>
                  <p className="text-sm text-orange-600 mb-6">
                    ⚠️ 当前对话内容将被清空，学习进度将跳转到该章节。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelJump}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      取消
                    </button>
                    <button
                      onClick={confirmJump}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      确认跳转
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showReplanDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">重新规划剩余路径</h3>
                  <p className="text-gray-600 mb-4">
                    请描述你希望如何调整接下来的学习内容：
                  </p>
                  <textarea
                    value={replanSuggestion}
                    onChange={(e) => setReplanSuggestion(e.target.value)}
                    placeholder="例如：增加更多实践评估、降低难度、增加具体案例讲解..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none mb-4 min-h-[100px]"
                  />
                  <p className="text-sm text-orange-600 mb-4">
                    ⚠️ 当前对话内容将被清空，AI将根据你的建议重新规划剩余的学习路径。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowReplanDialog(false);
                        setReplanSuggestion('');
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => adjustCurriculum(replanSuggestion)}
                      disabled={!replanSuggestion.trim() || loading}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      确认重新规划
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div 
              ref={chatContainerRef}
              className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg"
            >
              {conversation.map((msg, idx) => (
                <MessageBubble key={idx} msg={msg} />
              ))}
              {streamingMessage && (
                <div className="flex justify-start mb-4">
                  <div className="max-w-3xl rounded-lg px-4 py-3 bg-white border border-gray-200">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(streamingMessage) }}
                    />
                  </div>
                </div>
              )}
              {loading && !streamingMessage && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <Loader className="w-5 h-5 animate-spin text-indigo-600" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {state !== 'completed' && (
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    state === 'curriculum_review' ? '输入"开始学习"、"跳到第X项"或自定义要求（如"增加更多实践评估"）...' :
                    state === 'learning' ? '回答问题或提出疑问... (Shift+Enter换行)' :
                    state === 'practice' ? '提交答案或说明遇到的困难... (Shift+Enter换行)' :
                    '继续对话... (Shift+Enter换行)'
                  }
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none overflow-hidden min-h-[48px]"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim() || loading}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 h-12"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}

            {state === 'completed' && (
              <button
                onClick={() => {
                  setState('init');
                  setTopic('');
                  setToneStyle('');
                  setCurriculum(null);
                  setCurrentIndex(0);
                  setConversation([]);
                  setStudentProfile({ weaknesses: [], strengths: [] });
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                开始新的学习
              </button>
            )}
          </div>
        )}

        {studentProfile.weaknesses.length > 0 && state !== 'init' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📊 学习档案</h3>
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-gray-700">需要加强：</span>
                <span className="text-gray-600 ml-2">{studentProfile.weaknesses.join('、')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptiveLearningSystem;