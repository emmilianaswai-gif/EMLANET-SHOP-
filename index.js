import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import { hydrateStorage } from "./src/shim";
import App from "./App";

async function bootstrap() {
  // Load AsyncStorage values into the synchronous in-memory localStorage /
  // sessionStorage shims BEFORE any module code reads them.
  await hydrateStorage();
  registerRootComponent(App);
}

bootstrap();