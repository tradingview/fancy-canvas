import { Binding, BindingOptions } from './coordinate-space';
import { MediaQueryBinding } from './media-query-binding';
import { PixelContentBoxBinding } from './pixel-content-box-binding';

const defaultBindingOptions = {
	allowDownsampling: true,
};

function detectDevicePixelContentBox(): Promise<boolean> {
    return new Promise((resolve: (val: boolean) => void) => {
        const ro = new ResizeObserver((entries) => {
          resolve(entries.every((entry) => 'devicePixelContentBoxSize' in entry));
          ro.disconnect();
        });
        ro.observe(document.body, { box: 'device-pixel-content-box' });
      })
      .catch(() => false);
} 

function bindToMediaQueryBinding(canvas: HTMLCanvasElement, options?: BindingOptions): Binding {
    return new MediaQueryBinding(canvas, options || defaultBindingOptions);
}

function bindToPixelContentBoxBinding(canvas: HTMLCanvasElement, options?: BindingOptions): Binding {
    return new PixelContentBoxBinding(canvas, options || defaultBindingOptions);
}

export type CanvasBindingFactory = (canvas: HTMLCanvasElement, options?: BindingOptions) => Binding;

export function createCanvasBindingFactory(useObserverIfPossible?: boolean): Promise<CanvasBindingFactory> {
    return detectDevicePixelContentBox()
        .then((value: boolean) => {
            return value && useObserverIfPossible ?
            bindToPixelContentBoxBinding :
            bindToMediaQueryBinding;
        });
}
