/* global Zepto:true */
/* jshint unused:false*/

+function ($) {
  "use strict";
  var url = 'http://d.quketi.com/address/province_city_county_v1.0.0.json';
  var newVersion = url.split('_v')[ 1 ].split('.json')[ 0 ];

  var getName = function (data) {
    if (data.length === 0) return [ { code: "", name: "", children: [] } ];
    return data.map(function (d) {
      return d.name;
    });
  };

  var getCode = function (data) {
    return data.map(function (d) {
      return d.code;
    });
  };

  var getChildren = function (data) {
    if (data.children.length === 0) return [ { code: "", name: "", children: [] } ];
    return data.children;
  };

  var getChildrenName = function (data) {
    if (data.children.length === 0) return [ { code: "", name: "", children: [] } ];
    return data.children.map(function (d) {
      return d.name
    });
  };

  var getChildrenCode = function (data) {
    if (data.children.length === 0) return [ { code: "", name: "", children: [] } ];
    return data.children.map(function (d) {
      return d.code
    });
  };

  var getCities = function (data, d) {

    for (var i = 0; i < data.length; i++) {
      if (data[ i ].code === d) return getChildren(data[ i ]);
    }
    return [ { code: "", name: "", children: [] } ];
  };

  var getDistricts = function (data, p, c) {
    for (var i = 0; i < data.length; i++) {
      if (data[ i ].code === p) {
        for (var j = 0; j < data[ i ].children.length; j++) {
          if (data[ i ].children[ j ].code === c) {
            return getChildren(data[ i ].children[ j ]);
          }
        }
      }
    }
    return [ { code: "", name: "", children: [] } ];
  };

  var supportStorage = function () {
    try {
      return 'localStorage' in window && window[ 'localStorage' ] !== null;
    } catch (e) {
      return false;
    }
  };

  var setObject = function (key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  };

  var getObject = function (key) {
    var value = localStorage.getItem(key);
    return value && JSON.parse(value);
  };

  var getData = function (element, params, successCallBack) {
    $.get(url, function (response) {
      if (response) {
        setObject('citiesData', response);
        setObject('citiesDataVersion', newVersion);
        successCallBack(element, params, response);
      }
    });
  };

  var initCityPicker = function (element, params, data) {
    var provincesName = getName(data);
    var provincesCode = getCode(data);

    var initCitiesName = getChildrenName(data[ 0 ]);
    var initCitiesCode = getChildrenCode(data[ 0 ]);

    var initCities = getChildren(data[ 0 ]);
    var initDistrictsName = getChildrenName(initCities[ 0 ]);
    var initDistrictsCode = getChildrenCode(initCities[ 0 ]);

    var currentProvinceCode = provincesCode[ 0 ];
    var currentCityCode = initCitiesCode[ 0 ];
    var currentDistrictCode = initDistrictsName[ 0 ];

    var t;
    var defaults = {

      cssClass: "city-picker",
      rotateEffect: false,  //为了性能

      onChange: function (picker, values, displayValues) {
        var newProvinceCode = picker.cols[ 0 ].value;
        var newCity;
        var newCityCode;
        if (newProvinceCode !== currentProvinceCode) {
          // 如果Province变化，节流以提高reRender性能
          clearTimeout(t);

          t = setTimeout(function () {
            var newCities = getCities(data, newProvinceCode);
            newCity = newCities[ 0 ];
            newCityCode = newCity.code;
            var newDistricts = getDistricts(data, newProvinceCode, newCityCode);
            picker.cols[ 1 ].replaceValues(getCode(newCities), getName(newCities));
            picker.cols[ 2 ].replaceValues(getCode(newDistricts), getName(newDistricts));
            currentProvinceCode = newProvinceCode;
            currentCityCode = newCityCode;
            picker.updateValue();
          }, 200);
          return;
        }
        newCityCode = picker.cols[ 1 ].value;
        if (newCityCode !== currentCityCode) {
          var districts = getDistricts(data, newProvinceCode, newCityCode);
          picker.cols[ 2 ].replaceValues(getCode(districts), getName(districts));
          currentCityCode = newCityCode;
          picker.updateValue();
        }
      },

      cols: [
        {
          textAlign: 'center',
          values: provincesCode,
          displayValues: provincesName,
          cssClass: "col-province"
        },
        {
          textAlign: 'center',
          values: initCitiesCode,
          displayValues: initCitiesName,
          cssClass: "col-city"
        },
        {
          textAlign: 'center',
          values: initDistrictsCode,
          displayValues: initDistrictsName,
          cssClass: "col-district"
        }
      ],
      formatValue: function (picker, value, displayValue) {
        return displayValue.join(' ');
      }
    };

    var p = $.extend(defaults, params);
    //计算value
    var val = $(element).data('value');
    if (val) {
      p.value = val.split(" ");
      if (p.value[ 0 ]) {
        currentProvinceCode = p.value[ 0 ];
        p.cols[ 1 ].values = getCode(getCities(data, p.value[ 0 ]));
        p.cols[ 1 ].displayValues = getName(getCities(data, p.value[ 0 ]));
      }
      if (p.value[ 1 ]) {
        currentCityCode = p.value[ 1 ];
        p.cols[ 2 ].values = getCode(getDistricts(data, p.value[ 0 ], p.value[ 1 ]));
        p.cols[ 2 ].displayValues = getName(getDistricts(data, p.value[ 0 ], p.value[ 1 ]));
      } else {
        p.cols[ 2 ].values = getCode(getDistricts(data, p.value[ 0 ], p.cols[ 1 ].values[ 0 ]));
        p.cols[ 2 ].displayValues = getName(getDistricts(data, p.value[ 0 ], p.cols[ 1 ].values[ 0 ]));
      }
      if (p.value[ 2 ]) {
        currentDistrictCode = p.value[ 2 ];
      }
    }
    $(element).picker(p);
  };

  $.fn.cityPicker = function (params) {
    return this.each(function () {
      if (!this) return;

      var data;

      if (supportStorage) {
        var version = getObject('citiesDataVersion');
        if (version === newVersion) {
          data = getObject('citiesData');
          initCityPicker(this, params, data);
        }
        if (!data) {
          getData(this, params, initCityPicker);
        }
      } else {
        getData(this, params, initCityPicker);
      }
    });
  };

}(Zepto);
