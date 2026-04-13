import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, Smartphone, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIosDevice() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isStandaloneMode() {
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayModeStandalone;
}

export default function InstallPage() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const ios = useMemo(() => isIosDevice(), []);
  const android = useMemo(() => !ios, [ios]);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstallEvent(null);
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function handleAndroidInstall() {
    if (!installEvent) {
      return;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallEvent(null);
        setIsInstalled(true);
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-navy dark:text-slate-50">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <Card className="space-y-3 bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-amberAccent">StoreWatch</p>
          <h1 className="text-2xl font-bold tracking-tight">Install StoreWatch</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Save StoreWatch to your home screen so staff can open it like a regular app.
          </p>
        </Card>

        {isInstalled ? (
          <Card className="space-y-3 border border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">StoreWatch is already installed on this device</p>
            </div>
            <Link to="/">
              <Button fullWidth>Open StoreWatch</Button>
            </Link>
          </Card>
        ) : null}

        {android ? (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amberAccent" />
              <h2 className="text-lg font-bold">Android Install</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tap the button below. If your browser supports app install prompts, StoreWatch will install in one step.
            </p>
            <Button fullWidth disabled={!installEvent || installing || isInstalled} onClick={handleAndroidInstall}>
              <Download className="mr-2 h-4 w-4" />
              {installing ? 'Preparing...' : installEvent ? 'Install App' : 'Install Prompt Not Ready'}
            </Button>
            {!installEvent ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">If the button is disabled, open browser menu and choose Install App or Add to Home Screen.</p>
            ) : null}
          </Card>
        ) : null}

        {ios ? (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-amberAccent" />
              <h2 className="text-lg font-bold">iPhone Install</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">In Safari, install with these steps:</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
              <li>Tap the Share button.</li>
              <li>Choose Add to Home Screen.</li>
              <li>Tap Add.</li>
            </ol>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tip: if you opened this in Chrome on iPhone, copy the link and open it in Safari first.</p>
          </Card>
        ) : null}

        <Card className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">Need to login instead?</p>
          <Link to="/">
            <Button variant="secondary" fullWidth>
              Go to Login
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
