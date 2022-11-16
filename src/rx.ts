export interface NextObserver<T> {
	next: (value: T) => void;
}

export interface Unsubscribable {
	unsubscribe(): void;
}

export interface Subscribable<T> {
	subscribe(next: (value: T) => void): Unsubscribable;
}

export interface BehaviorSubject<T> extends Subscribable<T> {
	readonly value: T;
}
