using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace HudiSoftPOS.Converters
{
    public class HideOnSmallWidthConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is double width && parameter is string thresholdString && double.TryParse(thresholdString, out double threshold))
            {
                return width < threshold ? Visibility.Collapsed : Visibility.Visible;
            }
            return Visibility.Visible;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
