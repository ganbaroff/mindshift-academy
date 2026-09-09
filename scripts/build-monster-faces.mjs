/**
 * MindShift Academy — companion faces (Mochi, the capybara).
 *
 * PROVENANCE: geometry ported from `src/shared/ui/Capy.tsx` in the SIBLING repository
 * (the MindShift ADHD-PWA, same owner) — that file does NOT exist in mindshift-academy;
 * `grep -r Capy src/` here returns nothing. First-party artwork either way, no
 * third-party licence attaches. Hand-written as Lottie shape JSON by this script:
 * authored in a 200x200 space, scaled x5.12 onto a 1024x1024 stage.
 * No third-party artwork, no emoji glyphs, no raster assets, no font outlines.
 *
 * Usage:  node scripts/build-monster-faces.mjs [--check]
 *   (default) rewrites public/lottie/{happy,thinking,celebrating,sad}.json
 *   --check   builds in memory and fails if the files on disk differ
 *
 * Output is deterministic: same script -> byte-identical JSON.
 *
 * Both modes also run assertRest(): the `rest` marker is only worth writing if the
 * last frame really is a settled pose. It proves, per file, that (a) the marker sits
 * on the last frame, not the first, and (b) EVERY animated property is motionless
 * there — its final two keyframes hold the same value, so the face is not frozen
 * mid-gesture when loop={false} leaves it on screen. A rest marker at frame 0 (as the
 * outgoing thinking.json had) fails this check by construction.
 */
const K = 5.12;                                    // 200-space -> 1024-space
const P = v => v * K;
// Capy palette, verbatim
const C_BODY=[0.914,0.851,0.710,1], C_SHADOW=[0.796,0.706,0.533,1], C_BELLY=[0.957,0.922,0.839,1],
      C_NOSE=[0.353,0.275,0.196,1], C_STROKE=[0.478,0.361,0.227,1], C_CHEEK=[0.906,0.549,0.471,1],
      C_SPARK=[0.949,0.788,0.298,1], C_ORANGE=[0.949,0.600,0.290,1];
const V=v=>({a:0,k:v});
const OUT={o:{x:[0.23],y:[1]},i:{x:[0.32],y:[1]}};      // --ease-face-entrance
const INOUT={o:{x:[0.77],y:[0]},i:{x:[0.175],y:[1]}};   // --ease-face-settle
function A(kfs){
  return {a:1,k:kfs.map((kf,idx)=>{
    if(idx===kfs.length-1) return {t:kf.t,s:kf.s};
    if(kf.e==='hold') return {t:kf.t,s:kf.s,h:1};
    const e = kf.e==='inout'?INOUT:OUT;
    return {t:kf.t,s:kf.s,o:e.o,i:e.i};
  })};
}
const tr=()=>({ty:"tr",p:V([0,0]),a:V([0,0]),s:V([100,100]),r:V(0),o:V(100),sk:V(0),sa:V(0),nm:"t"});
const el=(cx,cy,rx,ry)=>({ty:"el",p:V([P(cx),P(cy)]),s:V([P(rx*2),P(ry*2)]),d:1,nm:"e"});
const fl=(c,o=100)=>({ty:"fl",c:V(c),o:V(o),r:1,bm:0,nm:"f"});
const st=(c,w,o=100)=>({ty:"st",c:V(c),o:V(o),w:V(P(w)),lc:2,lj:2,bm:0,nm:"s"});
const gr=(it,nm)=>({ty:"gr",it:[...it,tr()],nm:nm||"g",np:it.length+1,cix:2,bm:0,ix:1,hd:false});
// quadratic curve in 200-space -> lottie 2-vertex bezier in 1024-space
function q(x0,y0,cx,cy,x1,y1){
  const p0=[P(x0),P(y0)], c=[P(cx),P(cy)], p1=[P(x1),P(y1)];
  return {i:[[0,0],[(2/3)*(c[0]-p1[0]),(2/3)*(c[1]-p1[1])]],
          o:[[(2/3)*(c[0]-p0[0]),(2/3)*(c[1]-p0[1])],[0,0]],v:[p0,p1],c:false};
}
function line(x0,y0,x1,y1){
  return {i:[[0,0],[0,0]],o:[[0,0],[0,0]],v:[[P(x0),P(y0)],[P(x1),P(y1)]],c:false};
}
// closed lens shape (two quadratics) — Capy's filled joy smile
function lens(x0,y0,cxA,cyA,x1,y1,cxB,cyB){
  const p0=[P(x0),P(y0)], p1=[P(x1),P(y1)], a=[P(cxA),P(cyA)], b=[P(cxB),P(cyB)];
  return {c:true,v:[p0,p1],
    o:[[(2/3)*(a[0]-p0[0]),(2/3)*(a[1]-p0[1])],[(2/3)*(b[0]-p1[0]),(2/3)*(b[1]-p1[1])]],
    i:[[(2/3)*(b[0]-p0[0]),(2/3)*(b[1]-p0[1])],[(2/3)*(a[0]-p1[0]),(2/3)*(a[1]-p1[1])]]};
}
function poly(vs){ return {c:true,v:vs,i:vs.map(()=>[0,0]),o:vs.map(()=>[0,0])}; }
const sh=path=>({ty:"sh",ks:V(path),ind:0,nm:"p",hd:false});
const shA=kfs=>({ty:"sh",ks:A(kfs.map(k=>({t:k.t,s:[k.s],e:k.e}))),ind:0,nm:"p",hd:false});

/* ---- rig parts, straight from Capy.tsx ---- */
const SHADOW = [gr([el(100,182,50,5),fl(C_STROKE,10)],"shadow")];
const EAR_L  = [gr([el(68,66,12,14),fl(C_BODY),st(C_STROKE,2.2)],"outer"),gr([el(68,67,6,7.5),fl(C_SHADOW)],"inner")];
const EAR_R  = [gr([el(132,66,12,14),fl(C_BODY),st(C_STROKE,2.2)],"outer"),gr([el(132,67,6,7.5),fl(C_SHADOW)],"inner")];
const BODY   = [gr([el(100,112,58,55),fl(C_BODY),st(C_STROKE,2.4)],"body")];
const BELLY  = [gr([el(100,126,36,26),fl(C_BELLY,45)],"belly")];
const CHEEKS = [gr([el(64,116,8,4.5),fl(C_CHEEK,30)],"L"),gr([el(136,116,8,4.5),fl(C_CHEEK,30)],"R")];
const NOSE   = [gr([el(100,112,4,2.8),fl(C_NOSE)],"nose")];
const EYES = {
  closed: [gr([sh(q(76,100,82,104,88,100)),st(C_NOSE,2.6)],"L"),gr([sh(q(112,100,118,104,124,100)),st(C_NOSE,2.6)],"R")],
  joy:    [gr([sh(q(76,102,82,96,88,102)),st(C_NOSE,2.6)],"L"),gr([sh(q(112,102,118,96,124,102)),st(C_NOSE,2.6)],"R")],
  half:   [gr([sh(q(76,100,82,102,88,100)),st(C_NOSE,2.6)],"L"),gr([sh(q(112,100,118,102,124,100)),st(C_NOSE,2.6)],"R")],
  dots:   [gr([el(82,100,3,3),fl(C_NOSE)],"L"),gr([el(118,100,3,3),fl(C_NOSE)],"R")],
};
const BROW_SOFT_L = [gr([sh(q(77,94,82,92,87,94)),st(C_NOSE,1.7,70)],"L")];
const BROW_SOFT_R = [gr([sh(q(113,94,118,92,123,94)),st(C_NOSE,1.7,70)],"R")];
const M_SMILE = q(93,122,100,127,107,122);
const M_JOY   = lens(92,121,100,129,108,121,100,127);
const M_FROWN = q(92,126,100,121,108,126);
const M_LINE  = line(95,122,105,122);
// Capy's sparkle, centred on origin so the layer position places it
const SPARKLE = poly([[0,-P(8)],[P(3),-P(2)],[P(9),0],[P(3),P(2)],[0,P(8)],[-P(3),P(2)],[-P(9),0],[-P(3),-P(2)]]);

function build({nm,op,layers,desc}){
  // `rest` marker: the frame the face settles on. MonsterAvatarInner.tsx plays these
  // one-shot (loop={false}) and leaves the last frame on screen, so the last frame has
  // to be a readable pose. The marker is the machine-checkable promise that it is.
  return {v:"5.9.0",fr:60,ip:0,op,w:1024,h:1024,nm,ddd:0,assets:[],
    markers:[{tm:op,cm:"rest",dr:0}],
    meta:{a:"MindShift — Capy / Mochi rig (first-party artwork, ported from src/shared/ui/Capy.tsx)",
          d:desc,g:"Hand-authored Lottie shape JSON (scripts/build-monster-faces.mjs). No third-party artwork, no glyphs, no raster assets.",
          k:"mochi, capybara, companion, mindshift"},
    layers:layers.map((l,ix)=>({...l,ind:ix+1,op:l.op??op,ip:l.ip??0,st:0,sr:1,ddd:0,bm:0,ao:0}))};
}
const root=ks=>{const s=ks.s;
  if(s&&s.a===1) s.k.forEach(k=>{k.s=k.s.map(v=>v*GS);});
  else if(s) s.k=s.k.map(v=>v*GS);
  return {ty:3,nm:"rig.root",ks};};
const L=(nm,shapes,ks)=>({ty:4,nm,parent:1,ks,shapes});
const KS=(anchor,o2)=>{o2=o2||{};return {a:V(anchor),p:o2.p||V(anchor),s:o2.s||V([100,100]),r:o2.r||V(0),o:o2.o||V(100)};};
const CTR=[512,512], BODYC=[P(100),P(112)], EARLC=[P(68),P(66)], EARRC=[P(132),P(66)],
      EYESC=[P(100),P(100)], MOUTHC=[P(100),P(122)], BROWC=[P(100),P(93)];
const GS=1.14;                                     // rig fills more of the round avatar
const LIFT=-44;                                    // optical centring inside the round avatar
const RIG=[512,512+LIFT];
const off=(base,kfs)=>A(kfs.map(k=>({t:k.t,s:[base[0]+k.d[0],base[1]+k.d[1]],e:k.e})));
const out=[];

/* ================= happy — idle + correct answer, 4s ================= */
{
const op=240;
const layers=[
  root({a:V(CTR),p:off(RIG,[{t:0,d:[0,10]},{t:16,d:[0,0]},{t:70,d:[0,-21],e:'inout'},{t:130,d:[0,0],e:'inout'},{t:172,d:[0,-13],e:'inout'},{t:216,d:[0,0],e:'inout'},{t:240,d:[0,0]}]),
        s:A([{t:0,s:[96,96]},{t:14,s:[101.5,101.5]},{t:30,s:[100,100]},{t:240,s:[100,100]}]),r:V(0),o:V(100)}),
  L("ink.mouth",[gr([sh(M_SMILE),st(C_NOSE,2)],"m")],KS(MOUTHC,{s:A([{t:0,s:[90,84]},{t:18,s:[103,103]},{t:34,s:[100,100]},{t:240,s:[100,100]}])})),
  L("ink.nose",NOSE,KS(BODYC)),
  L("ink.eyes",EYES.closed,KS(EYESC,{s:A([{t:0,s:[100,100]},{t:104,s:[100,100],e:'hold'},{t:112,s:[100,58]},{t:124,s:[100,100]},{t:240,s:[100,100]}])})),
  L("mochi.cheeks",CHEEKS,KS(BODYC,{o:A([{t:0,s:[70]},{t:26,s:[100]},{t:240,s:[100]}])})),
  L("mochi.belly",BELLY,KS(BODYC)),
  L("mochi.body",BODY,KS(BODYC,{s:A([{t:0,s:[100,100]},{t:70,s:[99,101],e:'inout'},{t:130,s:[100,100],e:'inout'},{t:172,s:[99.4,100.6],e:'inout'},{t:216,s:[100,100],e:'inout'},{t:240,s:[100,100]}])})),
  L("mochi.ear.L",EAR_L,KS(EARLC,{r:A([{t:0,s:[-4]},{t:22,s:[2]},{t:52,s:[0]},{t:240,s:[0]}])})),
  L("mochi.ear.R",EAR_R,KS(EARRC,{r:A([{t:0,s:[4]},{t:22,s:[-2]},{t:52,s:[0]},{t:240,s:[0]}])})),
  L("mochi.shadow",SHADOW,KS([P(100),P(182)],{s:A([{t:0,s:[92,100]},{t:70,s:[86,100],e:'inout'},{t:130,s:[92,100],e:'inout'},{t:240,s:[92,100]}])})),
];
out.push(["happy",build({nm:"mochi-happy",op,layers,desc:"Idle rest and correct-answer face. Capy 'calm': closed eyes, smile, cheeks. Breathes twice, one eye-squeeze, settles."})]);
}

/* ================= thinking — grading + wrong answer, 3s ================= */
{
const op=180;
const dot=(x,y,r,t0)=>L("ink.thought",[gr([el(0,0,r,r),fl(C_NOSE,80)],"d")],
  {a:V([0,0]),p:A([{t:t0,s:[P(x),P(y)]},{t:t0+48,s:[P(x)+14,P(y)-52]},{t:180,s:[P(x)+14,P(y)-52]}]),s:V([100,100]),r:V(0),
   o:A([{t:t0,s:[0]},{t:t0+16,s:[100]},{t:t0+48,s:[100],e:'inout'},{t:t0+78,s:[0]},{t:180,s:[0]}])});
const layers=[
  root({a:V([P(100),P(160)]),p:off([P(100),P(160)+LIFT],[{t:0,d:[0,6]},{t:22,d:[0,0]},{t:180,d:[0,0]}]),
        s:A([{t:0,s:[98,98]},{t:20,s:[100.5,100.5]},{t:36,s:[100,100]},{t:180,s:[100,100]}]),
        r:A([{t:0,s:[0]},{t:28,s:[-6]},{t:76,s:[-4.2],e:'inout'},{t:118,s:[-5.4]},{t:180,s:[-5.4]}]),o:V(100)}),
  dot(139,86,3,20), dot(148,79,2.4,36), dot(156,73,1.8,52),
  L("ink.mouth",[gr([sh(M_SMILE),st(C_NOSE,2)],"m")],KS(MOUTHC,{s:A([{t:0,s:[100,100]},{t:28,s:[92,100]},{t:180,s:[92,100]}])})),
  L("ink.nose",NOSE,KS(BODYC)),
  L("ink.eyes",EYES.dots,KS(EYESC,{p:off(EYESC,[{t:0,d:[0,0]},{t:28,d:[16,-14]},{t:88,d:[12,-11],e:'inout'},{t:132,d:[15,-13]},{t:180,d:[15,-13]}]),
        s:A([{t:0,s:[100,100]},{t:28,s:[112,112]},{t:180,s:[112,112]}])})),
  L("ink.brow.L",BROW_SOFT_L,KS(BROWC,{p:off(BROWC,[{t:0,d:[0,6]},{t:26,d:[0,0]},{t:180,d:[0,0]}])})),
  L("ink.brow.raised",BROW_SOFT_R,KS(BROWC,{p:off(BROWC,[{t:0,d:[0,6]},{t:24,d:[0,-22]},{t:62,d:[0,-17],e:'inout'},{t:104,d:[0,-21]},{t:180,d:[0,-21]}]),
        s:A([{t:0,s:[100,100]},{t:24,s:[108,100]},{t:180,s:[108,100]}])})),
  L("mochi.cheeks",CHEEKS,KS(BODYC,{o:A([{t:0,s:[80]},{t:30,s:[92]},{t:180,s:[92]}])})),
  L("mochi.belly",BELLY,KS(BODYC)),
  L("mochi.body",BODY,KS(BODYC)),
  L("mochi.ear.L",EAR_L,KS(EARLC,{r:A([{t:0,s:[0]},{t:26,s:[-9]},{t:70,s:[-6]},{t:180,s:[-6]}])})),
  L("mochi.ear.R",EAR_R,KS(EARRC,{r:A([{t:0,s:[0]},{t:26,s:[12]},{t:70,s:[8]},{t:180,s:[8]}])})),
  L("mochi.shadow",SHADOW,KS([P(100),P(182)])),
];
out.push(["thinking",build({nm:"mochi-thinking",op,layers,desc:"Grading and wrong-answer face. Interested, never disappointed: head leans, dot eyes look up, one soft brow lifts, three thought dots rise once. The smile never leaves."})]);
}

/* ================= celebrating — 2.5s payoff ================= */
{
const op=150;
const spark=(x,y,scale,t0,rot)=>L("tint.sparkle",[gr([sh(SPARKLE),fl(C_SPARK),st(C_ORANGE,1.2)],"s")],
  {a:V([0,0]),p:V([P(x),P(y)]),r:A([{t:t0,s:[rot-24]},{t:t0+42,s:[rot+14]},{t:150,s:[rot+14]}]),
   s:A([{t:t0,s:[0,0]},{t:t0+12,s:[scale*1.18,scale*1.18]},{t:t0+26,s:[scale,scale]},{t:100,s:[scale,scale],e:'inout'},{t:130,s:[0,0]},{t:150,s:[0,0]}]),
   o:A([{t:t0,s:[0]},{t:t0+8,s:[100]},{t:100,s:[100],e:'inout'},{t:130,s:[0]},{t:150,s:[0]}])});
const layers=[
  root({a:V(CTR),p:off(RIG,[{t:0,d:[0,26]},{t:18,d:[0,-30]},{t:44,d:[0,4],e:'inout'},{t:68,d:[0,-16],e:'inout'},{t:96,d:[0,0],e:'inout'},{t:150,d:[0,0]}]),
        s:A([{t:0,s:[80,80]},{t:16,s:[112,112]},{t:32,s:[97,97]},{t:50,s:[102,102]},{t:70,s:[100,100]},{t:150,s:[100,100]}]),
        r:A([{t:0,s:[-4]},{t:24,s:[3.5]},{t:56,s:[-1.5],e:'inout'},{t:88,s:[0]},{t:150,s:[0]}]),o:V(100)}),
  spark(154,64,130,12,0), spark(46,74,95,24,20), spark(100,30,110,18,45),
  spark(38,150,80,36,10), spark(162,142,88,46,30),
  L("ink.mouth",[gr([sh(M_JOY),fl(C_NOSE,85)],"m")],KS(MOUTHC,{s:A([{t:0,s:[70,60]},{t:18,s:[112,116]},{t:38,s:[100,100]},{t:150,s:[100,100]}])})),
  L("ink.nose",NOSE,KS(BODYC)),
  L("ink.eyes",EYES.joy,KS(EYESC,{s:A([{t:0,s:[86,80]},{t:18,s:[108,112]},{t:44,s:[100,100]},{t:150,s:[100,100]}])})),
  L("mochi.cheeks",CHEEKS,KS(BODYC,{o:A([{t:0,s:[60]},{t:22,s:[100]},{t:150,s:[100]}]),s:A([{t:0,s:[100,100]},{t:22,s:[118,118]},{t:48,s:[108,108]},{t:150,s:[108,108]}])})),
  L("mochi.belly",BELLY,KS(BODYC)),
  L("mochi.body",BODY,KS(BODYC,{s:A([{t:0,s:[104,94]},{t:18,s:[97,104]},{t:40,s:[100.5,99.5]},{t:64,s:[100,100]},{t:150,s:[100,100]}])})),
  L("mochi.ear.L",EAR_L,KS(EARLC,{r:A([{t:0,s:[8]},{t:20,s:[-18]},{t:48,s:[8],e:'inout'},{t:80,s:[0]},{t:150,s:[0]}])})),
  L("mochi.ear.R",EAR_R,KS(EARRC,{r:A([{t:0,s:[-8]},{t:20,s:[18]},{t:48,s:[-8],e:'inout'},{t:80,s:[0]},{t:150,s:[0]}])})),
  L("mochi.shadow",SHADOW,KS([P(100),P(182)],{s:A([{t:0,s:[104,100]},{t:18,s:[74,100]},{t:44,s:[96,100],e:'inout'},{t:96,s:[92,100]},{t:150,s:[92,100]}])})),
];
out.push(["celebrating",build({nm:"mochi-celebrating",op,layers,desc:"2.5s correct-answer payoff. Capy 'happy': joy eyes, filled joy smile, sparkles. One hop with overshoot, a second smaller hop, settles on the joy face."})]);
}

/* ================= sad — delivered, never selected ================= */
{
const op=180;
const layers=[
  root({a:V([P(100),P(160)]),p:off([P(100),P(160)+LIFT],[{t:0,d:[0,-8]},{t:36,d:[0,10],e:'inout'},{t:180,d:[0,10]}]),
        s:A([{t:0,s:[100,100]},{t:40,s:[98.5,98.5]},{t:180,s:[98.5,98.5]}]),
        r:A([{t:0,s:[0]},{t:38,s:[2.5]},{t:180,s:[2.5]}]),o:V(100)}),
  L("ink.mouth",[gr([shA([{t:0,s:M_LINE},{t:38,s:M_FROWN},{t:180,s:M_FROWN}]),st(C_NOSE,2)],"m")],KS(MOUTHC)),
  L("ink.nose",NOSE,KS(BODYC)),
  L("ink.eyes",EYES.half,KS(EYESC,{p:off(EYESC,[{t:0,d:[0,0]},{t:38,d:[0,8]},{t:180,d:[0,8]}]),
        s:A([{t:0,s:[100,100]},{t:76,s:[100,100],e:'hold'},{t:88,s:[100,40],e:'inout'},{t:112,s:[100,100]},{t:180,s:[100,100]}])})),
  L("ink.brow.L",BROW_SOFT_L,KS(BROWC,{p:off(BROWC,[{t:0,d:[0,0]},{t:38,d:[0,10]},{t:180,d:[0,10]}])})),
  L("ink.brow.R",BROW_SOFT_R,KS(BROWC,{p:off(BROWC,[{t:0,d:[0,0]},{t:38,d:[0,10]},{t:180,d:[0,10]}])})),
  L("mochi.cheeks",CHEEKS,KS(BODYC,{o:A([{t:0,s:[80]},{t:60,s:[52]},{t:180,s:[52]}])})),
  L("mochi.belly",BELLY,KS(BODYC)),
  L("mochi.body",BODY,KS(BODYC,{s:A([{t:0,s:[100,100]},{t:40,s:[101,98.5]},{t:180,s:[101,98.5]}])})),
  L("mochi.ear.L",EAR_L,KS(EARLC,{r:A([{t:0,s:[0]},{t:44,s:[16]},{t:180,s:[16]}])})),
  L("mochi.ear.R",EAR_R,KS(EARRC,{r:A([{t:0,s:[0]},{t:44,s:[-16]},{t:180,s:[-16]}])})),
  L("mochi.shadow",SHADOW,KS([P(100),P(182)])),
];
out.push(["sad",build({nm:"mochi-sad",op,layers,desc:"Delivered for completeness; the product never selects it. Ears droop, half eyes, one slow blink, settles."})]);
}

/* Every animated property must be motionless on the final frame. Walks the BUILT
   JSON, so it also covers anything a future edit adds. */
function assertRest(name, data) {
  const problems = [];
  const m = data.markers && data.markers[0];
  if (!m || m.cm !== "rest") problems.push("no rest marker");
  else if (m.tm !== data.op) problems.push(`rest marker at ${m.tm}, last frame is ${data.op}`);
  const walk = (node, where) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${where}[${i}]`));
    if (!node || typeof node !== "object") return;
    if (node.a === 1 && Array.isArray(node.k) && node.k.length && typeof node.k[0].t === "number") {
      const kfs = node.k, last = kfs[kfs.length - 1], prev = kfs[kfs.length - 2];
      if (last.t !== data.op) problems.push(`${where}: ends at ${last.t}, not ${data.op}`);
      else if (prev && JSON.stringify(prev.s) !== JSON.stringify(last.s))
        problems.push(`${where}: still moving at rest (${JSON.stringify(prev.s)} -> ${JSON.stringify(last.s)})`);
      return;
    }
    for (const key of Object.keys(node)) walk(node[key], `${where}.${key}`);
  };
  data.layers.forEach(l => walk(l, l.nm));
  return problems;
}

export const FACES = out;
export { assertRest };

/* node-main — everything below is Node-only. Do not put rig code here. */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const dir = path.join(process.cwd(), "public", "lottie");
  let bad = 0, unrested = 0;
  const rows = [];
  for (const [name, data] of FACES) {
    const file = path.join(dir, `${name}.json`);
    const next = JSON.stringify(data);
    const sha = createHash("sha256").update(next).digest("hex");
    const problems = assertRest(name, data);
    if (problems.length) {
      unrested++;
      rows.push(`REST ${name}.json  ${problems.length} propert${problems.length === 1 ? "y" : "ies"} not settled on frame ${data.op}:`);
      problems.forEach(p => rows.push(`       ${p}`));
    }
    if (check) {
      const same = existsSync(file) && readFileSync(file, "utf8") === next;
      if (!same) bad++;
      rows.push(`${same ? "ok  " : "DIFF"} ${name}.json  ${next.length} B  ${sha.slice(0, 16)}  rest@${data.markers[0].tm}/${data.op}`);
    } else {
      writeFileSync(file, next);
      rows.push(`wrote ${name}.json  ${next.length} B  ${sha.slice(0, 16)}  rest@${data.markers[0].tm}/${data.op}`);
    }
  }
  console.log(rows.join("\n"));
  if (unrested) console.error(`\n${unrested} file(s) do not settle on their last frame — loop={false} would freeze them mid-gesture.`);
  if (bad) console.error(`\n${bad} file(s) differ from the generator. Run without --check to regenerate.`);
  if (bad || unrested) process.exit(1);
}
