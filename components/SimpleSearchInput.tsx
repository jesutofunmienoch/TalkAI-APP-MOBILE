import { View, Image, TextInput } from "react-native";

interface SimpleSearchInputProps {
  icon?: any;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: string;
}

const SimpleSearchInput = ({
  icon,
  placeholder = "Search...",
  value,
  onChangeText,
  containerStyle = "",
}: SimpleSearchInputProps) => {
  return (
    <View className={`bg-white rounded-lg shadow-md px-4 py-3 flex-row items-center ${containerStyle}`}>
      {icon && <Image source={icon} className="w-5 h-5 mr-3" />}
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        className="flex-1 text-base"
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
};

export default SimpleSearchInput;
