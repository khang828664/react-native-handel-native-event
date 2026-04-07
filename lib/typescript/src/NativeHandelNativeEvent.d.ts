import { type TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    syncUIRender(): Promise<boolean>;
    setSustainedPerformanceMode(enable: boolean): Promise<boolean>;
    setKeepScreenOn(enable: boolean): Promise<boolean>;
    activateMaxPower(): Promise<string>;
    deactivateMaxPower(): Promise<boolean>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeHandelNativeEvent.d.ts.map