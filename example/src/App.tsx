import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Button,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { multiply, syncUIRender } from 'react-native-handel-native-event';

export default function App() {
  const [isRendering, setIsRendering] = useState(false);
  const [renderLog, setRenderLog] = useState<string[]>([]);
  const [multiplyResult] = useState(multiply(3, 7));

  useEffect(() => {
    // Demo: Tự động sync UI khi app mount
    handleSyncUI('Auto sync on mount');
  }, []);

  const handleSyncUI = async (label: string) => {
    setIsRendering(true);
    const startTime = Date.now();

    try {
      const result = await syncUIRender();
      const duration = Date.now() - startTime;

      const logMessage = `[${new Date().toLocaleTimeString()}] ${label}: ${
        result ? 'SUCCESS' : 'FAILED'
      } (${duration}ms)`;

      setRenderLog((prev) => [logMessage, ...prev].slice(0, 10));
    } catch (error) {
      const errorMessage = `[${new Date().toLocaleTimeString()}] ${label}: ERROR - ${error}`;
      setRenderLog((prev) => [errorMessage, ...prev].slice(0, 10));
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.section}>
        <Text style={styles.title}>🧮 Multiply Test</Text>
        <Text style={styles.result}>multiply(3, 7) = {multiplyResult}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>🎨 UI Render Sync Test</Text>
        <Text style={styles.description}>
          Test syncUIRender() để đồng bộ UI render giữa Native và JS
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="🔄 Sync UI Render"
            onPress={() => handleSyncUI('Manual trigger')}
            disabled={isRendering}
          />
        </View>

        {isRendering && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Syncing UI...</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>📋 Render Log</Text>
        <View style={styles.logContainer}>
          {renderLog.length === 0 ? (
            <Text style={styles.emptyLog}>No logs yet</Text>
          ) : (
            renderLog.map((log, index) => (
              <Text key={index} style={styles.logItem}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  result: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    maxHeight: 300,
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  emptyLog: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
