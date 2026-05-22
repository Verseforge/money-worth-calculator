import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { ArrowUp, Check, Download, Edit3, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, Wallet, X } from 'lucide-react'

const STORAGE_KEY = 'money-value-calculator-final-v1'

const TYPE_CATEGORIES = [
  ['all', '全部'], ['food', '日常饮食'], ['transport', '交通出行'], ['fun', '社交娱乐'], ['daily', '生活日用'],
  ['clothes', '服装配饰'], ['beauty', '美容美妆'], ['digital', '数码小物'], ['study', '学习办公'], ['gift', '礼物人情'], ['other', '其他']
].map(([id, name]) => ({ id, name }))

const PRICE_CATEGORIES = [
  { id: 'all', name: '全部', min: 0, max: Infinity, includeMin: false },
  { id: 'ones', name: '个位数', min: 0, max: 10, includeMin: false },
  { id: 'tens', name: '两位数', min: 10, max: 100, includeMin: true },
  { id: 'hundreds', name: '三位数', min: 100, max: 1000, includeMin: true },
  { id: 'thousands', name: '四位数', min: 1000, max: 10000, includeMin: true },
  { id: 'tenThousands', name: '五位数', min: 10000, max: 100000, includeMin: true }
]

const TONES = [
  { id: 'plant', name: '轻松种草' },
  { id: 'cool', name: '冷静劝退' },
  { id: 'rational', name: '理性权衡' },
  { id: 'neutral', name: '客观换算' }
]

const COMBO_OPTIONS = [
  { id: '2', name: '两个' }, { id: '3', name: '三个' }, { id: '4', name: '四个' }, { id: '5', name: '五个' }, { id: 'random', name: '随机搭配' }
]

const DEFAULT_ITEMS = [
  ['sausage','🌭','烤肠',2.5,'根','food'], ['soda','🥤','汽水',3.5,'瓶','food'], ['milk-tea','🧋','奶茶',15,'杯','food'], ['burger','🍔','汉堡套餐',32,'份','food'], ['takeaway','🍱','外卖简餐',35,'份','food'], ['hotpot','🍲','火锅人均',120,'顿','food'],
  ['bus','🚌','公交',2,'次','transport'], ['metro','🚇','地铁',5,'次','transport'], ['bike','🚲','共享单车',2,'次','transport'], ['taxi','🚕','打车短途',25,'次','transport'], ['train','🚄','高铁短途',120,'趟','transport'], ['flight','✈️','低价机票',600,'张','transport'],
  ['game','🎮','手游小额充值',6,'次','fun'], ['movie','🎬','电影票',45,'张','fun'], ['ktv','🎤','KTV人均',80,'次','fun'], ['exhibit','🎡','展览门票',68,'张','fun'], ['boardgame','🧩','桌游人均',50,'次','fun'], ['concert','🎫','演出票普通档',280,'张','fun'],
  ['tissue','🧻','纸巾',5,'包','daily'], ['toothbrush','🪥','牙刷',12,'支','daily'], ['shampoo','🧴','洗发水',45,'瓶','daily'], ['shower','🧼','沐浴露',40,'瓶','daily'], ['laundry','🧺','洗衣液',35,'瓶','daily'], ['bedding','🛏️','四件套',199,'套','daily'], ['appliance','🛋️','小家电组合',12999,'套','daily'],
  ['socks','🧦','袜子',10,'双','clothes'], ['tshirt','👕','T恤',79,'件','clothes'], ['jeans','👖','牛仔裤',159,'条','clothes'], ['backpack','🎒','双肩包',180,'个','clothes'], ['shoes','👟','运动鞋',399,'双','clothes'], ['coat','🧥','外套',499,'件','clothes'],
  ['haircut','💇','基础理发',25,'次','beauty'], ['cleanser','🧼','洗面奶',69,'支','beauty'], ['sunscreen','🧴','防晒霜',89,'瓶','beauty'], ['lipstick','💄','口红',99,'支','beauty'], ['nail','💅','美甲',128,'次','beauty'], ['skincare','🧖','护肤套装',299,'套','beauty'],
  ['phone-case','📱','手机壳',29,'个','digital'], ['cable','🔌','充电线',25,'根','digital'], ['mouse','🖱️','鼠标',129,'个','digital'], ['earbuds','🎧','蓝牙耳机',199,'副','digital'], ['keyboard','⌨️','键盘',299,'个','digital'], ['laptop','💻','笔记本电脑',4999,'台','digital'], ['pro-computer','🖥️','高配电脑',15999,'台','digital'],
  ['pen','✏️','中性笔',3,'支','study'], ['notebook','📓','笔记本',12,'本','study'], ['print','🖨️','打印资料',20,'次','study'], ['book','📚','纸质书',49,'本','study'], ['course','🧑‍💻','线上课程',199,'门','study'], ['chair','💺','办公椅',399,'把','study'],
  ['small-gift','🎁','小礼物',50,'份','gift'], ['flowers','💐','花束',128,'束','gift'], ['redpacket-168','🧧','168红包',168,'个','gift'], ['cake','🍰','生日蛋糕',198,'个','gift'], ['treat','🍽️','请客吃饭',300,'次','gift'], ['holiday-gift','🎀','节日礼物',520,'份','gift'], ['redpacket-888','🧧','888红包',888,'个','gift']
].map(([id, emoji, name, price, unit, category]) => ({ id, emoji, name, price, unit, category, selected: true }))

const cnMoney = (n) => !Number.isFinite(n) ? '0' : Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '')
const cleanNumber = (v) => String(v).replace(/[^0-9.]/g, '')
function getPriceRange(price) { return PRICE_CATEGORIES.find(c => c.id !== 'all' && (c.includeMin ? price >= c.min : price > c.min) && price < c.max)?.id || 'tenThousands' }
function isInPriceCategory(item, id) { return id === 'all' || getPriceRange(item.price) === id }
function seededRandom(seed) { let v = seed % 2147483647; if (v <= 0) v += 2147483646; return () => ((v = v * 16807 % 2147483647) - 1) / 2147483646 }
function shuffleWithSeed(list, seed) { const rand = seededRandom(seed); const arr = [...list]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] } return arr }

function optimizeCombo(amount, items, targetCount, seed) {
  const scale = 10, target = Math.round(amount * scale)
  const pool = shuffleWithSeed(items, seed).map(i => ({ ...i, scaledPrice: Math.round(i.price * scale) }))
  const dp = Array.from({ length: targetCount + 1 }, () => new Map())
  dp[0].set(0, [])
  for (const item of pool) {
    for (let count = targetCount - 1; count >= 0; count--) {
      for (const [sum, combo] of Array.from(dp[count].entries())) {
        for (let qty = 1; qty <= 10; qty++) {
          const next = sum + item.scaledPrice * qty
          if (next > target) break
          if (!dp[count + 1].has(next)) dp[count + 1].set(next, [...combo, { ...item, count: qty }])
        }
      }
    }
    for (let i = 1; i <= targetCount; i++) {
      if (dp[i].size > 9000) dp[i] = new Map(Array.from(dp[i].entries()).sort((a,b)=>b[0]-a[0]).slice(0,9000))
    }
  }
  if (!dp[targetCount].size) return null
  const bestSum = Math.max(...dp[targetCount].keys())
  return { chosen: dp[targetCount].get(bestSum), total: bestSum / scale }
}

function buildCombo(amount, items, comboSize, seed) {
  if (!amount || amount <= 0) return null
  const pool = items.filter(i => i.selected && i.price <= amount).sort((a,b)=>a.price-b.price)
  if (pool.length < 2) return null
  const randomCount = 2 + Math.abs(Math.floor(Math.sin(seed * 999) * 10000)) % 4
  const targetCount = comboSize === 'random' ? randomCount : Number(comboSize)
  if (pool.length < targetCount) return null
  const candidates = []
  for (let i = 0; i < (comboSize === 'random' ? 24 : 16); i++) {
    const res = optimizeCombo(amount, pool, targetCount, seed * 1009 + i * 97)
    if (!res) continue
    const sig = res.chosen.map(x => `${x.id}:${x.count}`).sort().join('|')
    if (!candidates.some(c => c.sig === sig)) candidates.push({ ...res, sig })
  }
  if (!candidates.length) return null
  const ranked = candidates.sort((a,b)=>b.total-a.total)
  const best = ranked[0].total
  const close = ranked.filter(x => best - x.total <= Math.max(5, amount * 0.03))
  const selected = close[Math.abs(seed) % close.length] || ranked[0]
  return { items: selected.chosen.map(({ scaledPrice, ...i }) => i).sort((a,b)=>b.price*b.count-a.price*a.count), total: selected.total, rest: amount - selected.total, targetCount }
}

function getBudgetAmount(budget) { return budget.amounts?.[budget.type] || '' }
function budgetLevel(percent, type) {
  if (percent < 5) return type === 'savings' ? '对存款影响较小' : '小额支出'
  if (percent < 15) return '有感觉，但压力不大'
  if (percent < 30) return '需要认真想想'
  if (percent < 50) return type === 'savings' ? '会明显减少存款' : '明显影响本月预算'
  if (percent <= 100) return type === 'savings' ? '接近大额动用存款' : '大额支出'
  return type === 'savings' ? '超过当前存款' : '超出一个月预算'
}
function calcBudget(amount, budget) {
  const value = Number(getBudgetAmount(budget)); if (!budget.enabled || !amount || !value) return null
  const percent = amount / value * 100; const typeLabel = budget.type === 'living' ? '生活费' : budget.type === 'salary' ? '工资' : '存款'
  if (budget.type === 'savings') return { main: `${cnMoney(amount)}元 ≈ 当前存款的 ${cnMoney(percent)}%`, sub: percent > 100 ? '这笔金额已经超过你当前存款。' : `这笔金额约占你当前存款的 ${cnMoney(percent)}%。`, level: budgetLevel(percent, 'savings') }
  if (amount > value) { const months = amount / value; return { main: `${cnMoney(amount)}元 ≈ ${cnMoney(months)}个月${typeLabel}`, sub: `这已经超过一个月${typeLabel}，需要用 ${cnMoney(months)} 个月左右的预算来覆盖。`, level: budgetLevel(percent, 'monthly') } }
  return { main: `${cnMoney(amount)}元 ≈ 本月${typeLabel}的 ${cnMoney(percent)}%`, sub: budget.type === 'salary' ? `相当于你月工资的 ${cnMoney(percent / 10)} 成。` : `也就是说，这笔钱大约占掉你这个月可支配生活费的 ${cnMoney(percent)}%。`, level: budgetLevel(percent, 'monthly') }
}

function makeSummary({ amount, tone, mode, singleResults, combo, budgetResult }) {
  if (!amount) return '先输入一笔金额，看看它在生活里大概是什么分量。'
  if (mode === 'combo' && !combo) return '当前选中的标签暂时凑不出这一组组合。可以降低组合数量，或点亮更多单价不超过当前金额的标签后再试。'
  const topText = singleResults.filter(r => r.enough).slice(0, 6).map(r => `${cnMoney(r.count)}${r.unit}${r.name}`).join('、')
  const comboText = combo?.items?.map(x => `${x.count}${x.unit}${x.name}`).join('、')
  const budgetText = budgetResult ? `，也${budgetResult.main.replace(`${cnMoney(amount)}元 ≈ `, '约等于')}` : ''
  if (mode === 'combo' && combo) {
    if (tone === 'plant') return `${cnMoney(amount)}元可以被理解成${comboText}这一组日常参照${budgetText}。如果这笔支出能带来明确的快乐或价值，可以把它当成一次有计划的选择。`
    if (tone === 'cool') return `先别急着下单。${cnMoney(amount)}元已经相当于${comboText}这一组消费${budgetText}。如果只是临时冲动，可以先放一放再决定。`
    if (tone === 'rational') return `${cnMoney(amount)}元大约可以拆成${comboText}${budgetText}。你可以比较一下：把这笔钱花在当前选择上，是否比留给这些日常消费更值得。`
    return `${cnMoney(amount)}元约等于${comboText}，合计约 ${cnMoney(combo.total)}元${combo.rest > 0 ? `，还剩 ${cnMoney(combo.rest)}元` : ''}${budgetText}。这个结果仅作为金额参照。`
  }
  if (tone === 'plant') return `这笔钱大约相当于${topText || '几项日常消费'}${budgetText}。喜欢的话，可以把它当成一次给自己的小奖励。`
  if (tone === 'cool') return `先别急着下单。${cnMoney(amount)}元已经可以买到${topText || '不少日常小东西'}${budgetText}。确认它不是一时冲动，再决定也不迟。`
  if (tone === 'rational') return `${cnMoney(amount)}元大约相当于${topText || '若干日常消费'}${budgetText}。你可以比较一下：把这部分钱花在这里，是否比留给其他支出更值得。`
  return `${cnMoney(amount)}元约等于${topText || '一组日常消费'}${budgetText}。这个结果仅供参考，帮助你建立金额的具体感。`
}

export default function App() {
  const topRef = useRef(null), resultRef = useRef(null)
  const [amountText, setAmountText] = useState('')
  const [mode, setMode] = useState('single')
  const [categoryMode, setCategoryMode] = useState('type')
  const [activeType, setActiveType] = useState('all')
  const [activePrice, setActivePrice] = useState('all')
  const [tone, setTone] = useState('rational')
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [budget, setBudget] = useState({ enabled: false, type: 'living', amounts: { living: '2000', salary: '6000', savings: '10000' } })
  const [comboSize, setComboSize] = useState('random')
  const [comboSeed, setComboSeed] = useState(7)
  const [singleSeed, setSingleSeed] = useState(11)
  const [showAllItems, setShowAllItems] = useState(false)
  const [typeSortDesc, setTypeSortDesc] = useState(false)

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (s?.items) setItems(s.items); if (s?.budget) setBudget(s.budget) } catch {} }, [])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, budget })) }, [items, budget])

  const amount = Number(amountText)
  const filteredItems = useMemo(() => {
    let list = [...items]
    if (categoryMode === 'type') list = activeType === 'all' ? list : list.filter(i => i.category === activeType)
    if (categoryMode === 'price') list = list.filter(i => isInPriceCategory(i, activePrice))
    return list.sort((a,b) => categoryMode === 'type' && typeSortDesc ? b.price - a.price : a.price - b.price)
  }, [items, categoryMode, activeType, activePrice, typeSortDesc])
  const displayedItems = showAllItems ? filteredItems : filteredItems.slice(0, 6)
  const selectedItems = items.filter(i => i.selected)
  const singleResults = useMemo(() => amount > 0 ? selectedItems.map(i => ({ ...i, count: amount / i.price, enough: amount / i.price >= 1, lack: i.price - amount })) : [], [amount, selectedItems])
  const singleDisplayResults = useMemo(() => [...shuffleWithSeed(singleResults.filter(i=>i.enough), singleSeed), ...singleResults.filter(i=>!i.enough).sort((a,b)=>a.price-b.price)].slice(0, 6), [singleResults, singleSeed])
  const combo = useMemo(() => buildCombo(amount, selectedItems, comboSize, comboSeed), [amount, selectedItems, comboSize, comboSeed])
  const budgetResult = useMemo(() => calcBudget(amount, budget), [amount, budget])
  const summary = makeSummary({ amount, tone, mode, singleResults: singleDisplayResults, combo, budgetResult })

  const updateItem = (id, patch) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  const selectVisible = (value) => { const ids = new Set(filteredItems.map(i=>i.id)); setItems(prev => prev.map(i => ids.has(i.id) ? { ...i, selected: value } : i)) }
  const openEdit = (item) => { setEditing(item.id); setDraft({ ...item }) }
  const addItem = () => { setEditing('new'); setDraft({ emoji:'🏷️', name:'自定义标签', price:15, unit:'份', category: categoryMode === 'type' && activeType !== 'all' ? activeType : 'other', selected:true }) }
  const saveDraft = () => { const price = Number(draft.price); if (!draft.name || !price) return; if (editing === 'new') setItems(prev => [...prev, { ...draft, id:`custom-${Date.now()}`, price }]); else updateItem(editing, { ...draft, price }); setEditing(null); setDraft(null) }
  const resetAll = () => { setAmountText(''); setMode('single'); setCategoryMode('type'); setActiveType('all'); setActivePrice('all'); setTone('rational'); setItems(DEFAULT_ITEMS); setBudget({ enabled:false, type:'living', amounts:{ living:'2000', salary:'6000', savings:'10000' }}); setComboSize('random'); setComboSeed(7); setSingleSeed(11); setShowAllItems(false); setTypeSortDesc(false); localStorage.removeItem(STORAGE_KEY) }
  const exportImage = async () => { if (!resultRef.current) return; const canvas = await html2canvas(resultRef.current, { backgroundColor:'#f9fafb', scale:2 }); const a = document.createElement('a'); a.download = `这笔钱值多少-${cnMoney(amount || 0)}元.png`; a.href = canvas.toDataURL('image/png'); a.click() }

  return <main className="page">
    <section ref={topRef} className="card hero">
      <div className="pill"><Sparkles size={14}/> 金额感知小工具</div>
      <div className="byline">by @Verseforge</div>
      <h1>这笔钱值多少？</h1>
      <p>输入一笔金额，把它换算成奶茶、通勤、外卖、电影票和更多日常消费，看看它在生活里大概是什么分量。</p>
      <label className="label">你想衡量多少钱？</label>
      <div className="moneyInput"><input value={amountText} onChange={e=>setAmountText(cleanNumber(e.target.value))} placeholder="比如 199"/><span>元</span></div>
    </section>

    <section className="card">
      <div className="seg two">{[['single','单项等价'],['combo','组合换算']].map(t=><button key={t[0]} className={mode===t[0]?'on':''} onClick={()=>setMode(t[0])}>{t[1]}</button>)}</div>
      <p className="hint">{mode === 'single' ? '分别看看这笔钱约等于多少份某个东西。' : '把这笔钱拆成一组更具体的日常消费。'}</p>
      {mode === 'combo' && <div className="chips light"><span>组合数量</span>{COMBO_OPTIONS.map(o=><button key={o.id} className={comboSize===o.id?'dark':''} onClick={()=>{setComboSize(o.id); setComboSeed(s=>s+1)}}>{o.name}</button>)}</div>}
    </section>

    <section className="card">
      <div className="row"><b>选择参照</b><div><button className="mini" onClick={()=>selectVisible(true)}>全选</button><button className="mini" onClick={()=>selectVisible(false)}>清空</button></div></div>
      <p className="tip">点亮的标签会参与换算；点击标签卡片可取消或重新点亮。需要改价格、名称或分类时，请点标签下方的“编辑”。</p>
      <div className="chips">{[['type','按类型'],['price','按价格'],['budget','按预算']].map(t=><button key={t[0]} className={categoryMode===t[0]?'dark':''} onClick={()=>setCategoryMode(t[0])}>{t[1]}</button>)}</div>
      {categoryMode === 'type' && <><div className="chips small">{TYPE_CATEGORIES.map(c=><button key={c.id} className={activeType===c.id?'dark':''} onClick={()=>setActiveType(c.id)}>{c.name}</button>)}</div><button className="sortBtn" onClick={()=>setTypeSortDesc(v=>!v)}>{typeSortDesc?'按低价优先':'按高价优先'}</button></>}
      {categoryMode === 'price' && <div className="chips small">{PRICE_CATEGORIES.map(c=><button key={c.id} className={activePrice===c.id?'dark':''} onClick={()=>setActivePrice(c.id)}>{c.name}</button>)}</div>}
      {categoryMode === 'budget' ? <BudgetPanel budget={budget} setBudget={setBudget} result={budgetResult}/> : <>
        <div className="tagGrid">{displayedItems.map(item=><div key={item.id} className={`tag ${item.selected?'':'off'}`}><button onClick={()=>updateItem(item.id,{selected:!item.selected})}><span>{item.emoji}</span><b>{item.name}</b><small>{item.price}元 / {item.unit}</small></button><button className="edit" onClick={()=>openEdit(item)}><Edit3 size={12}/> 编辑</button></div>)}</div>
        {filteredItems.length > 6 && <button className="wideSoft" onClick={()=>setShowAllItems(v=>!v)}>{showAllItems?'收起标签':`展开更多（还有 ${filteredItems.length - 6} 个）`}</button>}
        <button className="wide dashed" onClick={addItem}><Plus size={16}/> 添加标签</button>
      </>}
    </section>

    {categoryMode !== 'budget' && <BudgetPanel budget={budget} setBudget={setBudget} result={budgetResult}/>}

    <div ref={resultRef} className="exportArea"><section className="card result">
      <div className="row wrap"><h2>换算结果</h2><div><button className="mini" onClick={mode==='single'?()=>setSingleSeed(s=>s+1):()=>setComboSeed(s=>s+1)}><RefreshCw size={14}/> 换一组</button><button className="mini" onClick={exportImage}><Download size={14}/> 导出结果</button></div></div>
      <div className="chips small">{TONES.map(t=><button key={t.id} className={tone===t.id?'dark':''} onClick={()=>setTone(t.id)}>{t.name}</button>)}</div>
      {mode === 'single' ? <div className="resultGrid">{singleDisplayResults.length ? singleDisplayResults.map(r=><div key={r.id} className={`resultItem ${r.enough?'':'dim'}`}><div><b>{r.emoji} {r.enough ? `≈ ${cnMoney(r.count)}${r.unit}${r.name}` : `还差 ${cnMoney(r.lack)}元买 1${r.unit}${r.name}`}</b><small>{r.price}元 / {r.unit}</small></div>{r.enough?<Check size={18}/>:<X size={18}/>}</div>) : <Empty/>}</div> : <div className="comboBox">{combo ? <><p>{cnMoney(amount)}元大概可以换成 {combo.targetCount} 个参照：</p><div className="comboTags">{combo.items.map(i=><span key={i.id}>{i.emoji} {i.count}{i.unit}{i.name}</span>)}</div><p>合计 {cnMoney(combo.total)}元{combo.rest > 0 ? `，还剩 ${cnMoney(combo.rest)}元。` : '。'}</p></> : <Empty text="当前选中的可用标签暂时凑不出这个数量的组合。请降低组合数量，或点亮更多单价不超过当前金额的标签。"/>}</div>}
      <div className="summary"><small>总结</small><p>{summary}</p></div>
      <button className="wideSoft" onClick={()=>topRef.current?.scrollIntoView({behavior:'smooth'})}><ArrowUp size={16}/> 换一个金额试试</button>
    </section></div>

    <footer className="foot"><p>默认价格仅供参考，你可以修改标签的单价、名称和分类，让它更贴合你的生活实际；也可以自定义添加标签。</p><p>这个工具不会替你做决定，只是帮你把金额换成更具体的生活参照。买不买、值不值，最后还是由你决定。</p><div><button onClick={()=>{setItems(DEFAULT_ITEMS);localStorage.removeItem(STORAGE_KEY)}}><RotateCcw size={13}/> 恢复默认标签</button><button className="danger" onClick={resetAll}><Trash2 size={13}/> 全部重置</button></div></footer>

    {editing && draft && <div className="modal"><div className="dialog"><div className="row"><h3>{editing==='new'?'添加标签':'编辑标签'}</h3><button onClick={()=>setEditing(null)}><X/></button></div><div className="form"><Field label="Emoji" value={draft.emoji} onChange={v=>setDraft({...draft,emoji:v})}/><Field label="名称" value={draft.name} onChange={v=>setDraft({...draft,name:v})}/><Field label="价格" value={draft.price} onChange={v=>setDraft({...draft,price:cleanNumber(v)})}/><Field label="量词" value={draft.unit} onChange={v=>setDraft({...draft,unit:v})}/></div><p className="label">分类</p><div className="chips small categoryPicker">{TYPE_CATEGORIES.filter(c=>c.id!=='all').map(c=><button key={c.id} className={draft.category===c.id?'dark':''} onClick={()=>setDraft({...draft,category:c.id})}>{c.name}</button>)}</div><button className="wide save" onClick={saveDraft}>保存</button></div></div>}
  </main>
}

function BudgetPanel({ budget, setBudget, result }) {
  const value = getBudgetAmount(budget)
  const setValue = (v) => setBudget(b => ({ ...b, amounts: { living: b.amounts?.living || '2000', salary: b.amounts?.salary || '6000', savings: b.amounts?.savings || '10000', [b.type]: cleanNumber(v) } }))
  return <section className="card"><div className="row"><b><Wallet size={17}/> 预算参照</b><button className="textBtn" onClick={()=>setBudget(b=>({...b,enabled:!b.enabled}))}>{budget.enabled?'隐藏':'开启'}</button></div>{budget.enabled ? <><div className="seg three">{[['living','月生活费'],['salary','月工资'],['savings','存款']].map(t=><button key={t[0]} className={budget.type===t[0]?'on':''} onClick={()=>setBudget(b=>({...b,type:t[0]}))}>{t[1]}</button>)}</div><div className="budgetInput"><input value={value} onChange={e=>setValue(e.target.value)} placeholder={budget.type==='living'?'比如 2000':budget.type==='salary'?'比如 6000':'比如 10000'}/><span>元</span></div>{result ? <div className="budgetResult"><b>{result.main}</b><p>{result.sub}</p><span>{result.level}</span></div> : <p className="tip">输入预算金额后，会显示这笔钱占你生活费、工资或存款的比例。</p>}<p className="hint">生活费、工资和存款会分别保存，不会互相覆盖。</p></> : <button className="wide dashed" onClick={()=>setBudget(b=>({...b,enabled:true}))}>+ 添加预算参照</button>}</section>
}
function Field({ label, value, onChange }) { return <label><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)}/></label> }
function Empty({ text='先输入一笔金额，看看它能换成什么。' }) { return <div className="empty">{text}</div> }
