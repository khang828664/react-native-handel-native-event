import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  syncUIRender(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HandelNativeEvent');
