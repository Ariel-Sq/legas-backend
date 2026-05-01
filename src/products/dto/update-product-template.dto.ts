import { PartialType } from '@nestjs/swagger';
import { CreateProductTemplateDto } from './create-product-template.dto';

export class UpdateProductTemplateDto extends PartialType(
  CreateProductTemplateDto,
) {}
