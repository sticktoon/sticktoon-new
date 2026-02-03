# Canva-Style Theme Changes for CustomOrder.tsx

## Main Background (Line ~514)
Change from:
```tsx
<div className="flex h-[calc(100vh-64px)] w-full bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 overflow-hidden select-none relative">
```

To:
```tsx
<div className="flex h-[calc(100vh-64px)] w-full bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-hidden select-none relative">
  {/* Canva-style Background Elements */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] bg-purple-300/15 rounded-full blur-[120px]" />
    <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-300/15 rounded-full blur-[100px]" />
    <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-pink-300/12 rounded-full blur-[90px]" />
  </div>
```

## Error Message (Line ~518)
Change from:
```tsx
<div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-red-400">
```

To:
```tsx
<div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-3 border-white">
```

## Sidebar (Line ~526)
Change from:
```tsx
<div className="hidden md:flex w-16 bg-white border-r border-slate-200 flex-col z-30 shadow-[6px_0_30px_rgba(15,23,42,0.08)]">
```

To:
```tsx
<div className="hidden md:flex w-16 bg-white/90 backdrop-blur-sm border-r border-purple-200 flex-col z-30 shadow-[4px_0_20px_rgba(168,85,247,0.1)]">
```

## Tool Button Hover (Line ~456)
Change from:
```tsx
: 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
```

To:
```tsx
: 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
```

## Panel Header (Line ~542)
Change from:
```tsx
<div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
```

To:
```tsx
<div className="p-4 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
```

## Add to Cart Button (Line ~580)
Change from:
```tsx
<button onClick={handleAddToCart} disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">
```

To:
```tsx
<button onClick={handleAddToCart} disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 border-3 border-purple-800 shadow-[4px_4px_0px_rgba(168,85,247,0.3)] hover:shadow-[6px_6px_0px_rgba(168,85,247,0.4)] transition-all">
```

## Add Text Button (Line ~589)
Change from:
```tsx
<button onClick={addText} className="px-4 h-10 bg-blue-600 text-white rounded-xl font-bold text-sm">Add</button>
```

To:
```tsx
<button onClick={addText} className="px-4 h-10 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-bold text-sm border-2 border-purple-700 shadow-lg hover:shadow-xl transition-all">Add</button>
```

## Upload Image Button (Line ~595)
Change from:
```tsx
<button onClick={() => fileInputRef.current?.click()} className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold text-sm flex items-center justify-center gap-2">
```

To:
```tsx
<button onClick={() => fileInputRef.current?.click()} className="w-full h-12 rounded-xl border-3 border-dashed border-purple-300 bg-purple-50/50 text-purple-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-100 transition-all">
```
