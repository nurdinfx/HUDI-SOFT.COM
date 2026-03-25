using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;

namespace HudiSoftPOS.Resources
{
    /// <summary>
    /// Converts a bool to one of two brushes. True = green (occupied), False = semi-transparent (free).
    /// Used by TableManagementView and OrdersView for status coloring.
    /// </summary>
    public class StatusToBrushConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is bool isOccupied)
                return isOccupied
                    ? new SolidColorBrush(Color.FromArgb(220, 239, 83, 80))   // Red occupied
                    : new SolidColorBrush(Color.FromArgb(220, 102, 187, 106)); // Green free

            if (value is string status)
            {
                return status?.ToLower() switch
                {
                    "pending"    => new SolidColorBrush(Color.FromArgb(200, 255, 167,  38)),
                    "cooking"    => new SolidColorBrush(Color.FromArgb(200,  66, 165, 245)),
                    "ready"      => new SolidColorBrush(Color.FromArgb(200, 102, 187, 106)),
                    "completed"  => new SolidColorBrush(Color.FromRgb(76, 175, 80)), // Green
                    "cancelled"  => new SolidColorBrush(Color.FromRgb(239, 83, 80)), // Red
                    "low"        => new SolidColorBrush(Color.FromArgb(200, 239, 83,  80)),
                    "ok"         => new SolidColorBrush(Color.FromArgb(200, 102, 187, 106)),
                    _            => new SolidColorBrush(Color.FromArgb(180, 255, 255, 255)),
                };
            }

            return new SolidColorBrush(Colors.Gray);
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }

    /// <summary>
    /// Converts bool to Collapsed (true=Visible, false=Collapsed) — inverse of BooleanToVisibilityConverter.
    /// </summary>
    public class InverseBooleanToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is bool b)
                return b ? Visibility.Collapsed : Visibility.Visible;
            return Visibility.Visible;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }

    /// <summary>
    /// Returns true if the bound value equals the ConverterParameter.
    /// Used by POSView to highlight the selected category tab.
    /// </summary>
    public class EqualityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
            => Equals(value, parameter);

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }

    /// <summary>
    /// Returns Visible if string is not null or empty, otherwise Collapsed.
    /// Used for image path previews.
    /// </summary>
    public class StringToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return (value is string s && !string.IsNullOrEmpty(s)) ? Visibility.Visible : Visibility.Collapsed;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }

    /// <summary>
    /// Returns Collapsed if string is not null or empty, otherwise Visible.
    /// Used for hiding placeholders when images are present.
    /// </summary>
    public class InverseStringToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return (value is string s && !string.IsNullOrEmpty(s)) ? Visibility.Collapsed : Visibility.Visible;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }

    /// <summary>
    /// Converts a string to UPPERCASE.
    /// </summary>
    public class StringToUpperCaseConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return value?.ToString()?.ToUpper() ?? string.Empty;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotImplementedException();
    }
}
