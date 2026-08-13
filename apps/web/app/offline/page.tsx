export default function OfflinePage() {
  return (
    <main className="offline-page">
      <p className="eyebrow">离线模式</p>
      <h1>网络不可用，已保留本地应用外壳。</h1>
      <p>移动端和后续数据快照会继续从本地缓存读取；恢复网络后可检查国服数据更新。</p>
      <a href="/">返回首页</a>
    </main>
  );
}
