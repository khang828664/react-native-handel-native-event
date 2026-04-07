import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  syncUIRender(): Promise<boolean>;
  setSustainedPerformanceMode(enable: boolean): Promise<boolean>;
  setKeepScreenOn(enable: boolean): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HandelNativeEvent');
