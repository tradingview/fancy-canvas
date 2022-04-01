import Disposable from './disposable.js'
import { NextObserver, Unsubscribable, BehaviorSubject } from './rx.js';

class Observable implements BehaviorSubject<number>, Disposable {
	private _window: Window;
	private readonly _resolutionListener = () => this._onResolutionChanged();
	private _resolutionMediaQueryList: MediaQueryList | null = null;
	private _observers: NextObserver<number>[] = [];

	public constructor(win: Window) {
		this._window = win;
		this._installResolutionListener();
	}

	public dispose(): void {
		this._uninstallResolutionListener();
		(this._window as unknown as null) = null;
	}

	public get value(): number {
		return this._window.devicePixelRatio;
	}

	public subscribe(next: (value: number) => void): Unsubscribable {
		const observer: NextObserver<number> = { next };
		this._observers.push(observer);
		return { unsubscribe: () => this._observers = this._observers.filter(o => o != observer) };
	}
	
	private _installResolutionListener(): void {
		if (this._resolutionMediaQueryList !== null) {
			throw new Error('Resolution listener is already installed');
		}

		const dppx = this._window.devicePixelRatio;
		this._resolutionMediaQueryList = this._window.matchMedia(`all and (resolution: ${dppx}dppx)`);
		// IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
		this._resolutionMediaQueryList.addListener(this._resolutionListener);
	}

	private _uninstallResolutionListener(): void {
		if (this._resolutionMediaQueryList !== null) {
			// IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
			this._resolutionMediaQueryList.removeListener(this._resolutionListener);
			this._resolutionMediaQueryList = null;
		}
	}

	private _reinstallResolutionListener(): void {
		this._uninstallResolutionListener();
		this._installResolutionListener();
	}
	
	private _onResolutionChanged(): void {
		this._observers.forEach(observer => observer.next(this._window.devicePixelRatio));
		this._reinstallResolutionListener();
	}
}

export function createObservable(win: Window): BehaviorSubject<number> & Disposable {
	return new Observable(win);
}
