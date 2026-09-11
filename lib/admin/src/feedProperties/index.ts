// Copyright (C) 2026 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { filter, forEach, isEmpty, join, map } from 'lodash-es';
import { FeedProperty } from '../types';

/**
 * An interface for working with xml properties from an xml feed
 */
export interface UseXmlProperties {
  /**
   * Gets the current properties as xml
   */
  toXmlString(properties: FeedProperty[] | undefined): string;

  /**
   * Saves properties values from a json string
   * @param json The property json to parse
   * @returns The parsed properties, or an empty array when there is nothing to parse
   */
  fromJsonString(json: string | undefined): FeedProperty[];
}

/**
 * Creates a new instance of the useXmlProperties api from the given feed
 * @param properties The properties to read and watch for changes from
 * @returns An api for working with xml properties
 */
export const useXmlProperties = (): UseXmlProperties => {
  const getPropertyXml = (properties: FeedProperty[]): string => {
    let output = '';
    forEach(properties, (prop) => {
      //Open tag (with namespace if present)
      output += !isEmpty(prop.namespace) ? `<${prop.namespace}:${prop.name}` : `<${prop.name}`;

      if (!isEmpty(prop.attributes)) {
        forEach(prop.attributes, (value, key) => (output += ` ${key}="${value}"`));
      }

      //Recursive call for nested property, or add its value
      output += !isEmpty(prop.properties)
        ? `>${getPropertyXml(prop.properties ?? [])}`
        : `>${prop.value || ''}`;

      //Close tag
      output += !isEmpty(prop.namespace) ? `</${prop.namespace}:${prop.name}>` : `</${prop.name}>`;
      return output;
    });
    return output;
  };

  const toXmlString = (properties: FeedProperty[] | undefined): string => {
    if (properties === undefined) {
      return '';
    }
    return join(
      map(properties, (p) => getPropertyXml([p])),
      '\n'
    );
  };

  const fromJsonString = (json: string | undefined): FeedProperty[] => {
    if (isEmpty(json)) {
      //Clear all properties if json is undefined
      return [];
    }

    //Guarded by the isEmpty check above: json is a non-empty string here.
    //Note: malformed JSON still throws, matching previous behavior.
    const parsed = JSON.parse(json ?? '');

    const props = map(parsed, (prop) => ({
      name: prop.name,
      value: prop.value,
      namespace: prop.namespace,
      attributes: prop.attributes,
      properties: prop.properties,
    }));

    //Remove any empty properties
    return filter(props, (p) => !isEmpty(p.name));
  };

  return { toXmlString, fromJsonString };
};
