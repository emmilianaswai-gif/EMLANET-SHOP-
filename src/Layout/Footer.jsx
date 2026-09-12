import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, font, radius } from "../../theme";

export default function Footer() {
  const navigation = useNavigation();
  const year = new Date().getFullYear();
  const links = ["About", "Privacy", "Terms", "Support"];
  const go = (label) => {
    const name = { About: "About", Privacy: "Privacy", Terms: "Terms", Support: "Support" }[label];
    if (name) navigation.navigate(name);
  };
  return (
    <View style={styles.footer}>
      <Text style={styles.copy}>
        © {year} <Text style={styles.brand}>EMLANETSHOP</Text>. All rights reserved.
      </Text>
      <View style={styles.links}>
        {links.map((l) => (
          <Pressable key={l} onPress={() => go(l)}>
            <Text style={styles.link}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.slate900,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: "auto",
    alignItems: "center",
  },
  copy: { color: colors.slate500, fontSize: font.xs, textAlign: "center" },
  brand: { color: colors.slate300, fontWeight: "700" },
  links: { flexDirection: "row", gap: 16, marginTop: 6, flexWrap: "wrap", justifyContent: "center" },
  link: { color: colors.slate500, fontSize: font.xs },
});