
// ============================================
// modules/abac/abac.controller.ts
// ============================================
import { Controller, Post, Get, Body, Delete, Param, ParseIntPipe, Put, } from '@nestjs/common';
import { AbacService } from './abac.service';
import { CreateAbacAttributeDto, CreateAbacPolicyDto, EvaluatePolicyDto } from './dto/abac.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from 'src/core/decorators/public.decorator';

@Controller('abac')
export class AbacController {
  constructor(private abacService: AbacService) { }

  @Post('attributes')
  @Permissions('abac:manage')
  async createAttribute(@Body() dto: CreateAbacAttributeDto) {
    console.log("🚀 ~ AbacController ~ createAttribute ~ dto:", dto)
    return this.abacService.createAttribute(dto);
  }

  @Get('attributes')
  @Permissions('abac:read')
  async findAllAttributes() {
    return this.abacService.findAllAttributes();
  }

  @Post('policies')
  @Permissions('abac:manage')
  async createPolicy(
    @Body() dto: CreateAbacPolicyDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.abacService.createPolicy(dto, userId);
  }

  @Post('policies/query')
  @Permissions('abac:read')
  async findAllPolicies(@Body('organizationId') organizationId?: number) {
    return this.abacService.findAllPolicies(
      organizationId ? BigInt(organizationId) : undefined
    );
  }

  @Post('evaluate')
  @Permissions('abac:evaluate')
  async evaluatePolicy(@Body() dto: EvaluatePolicyDto) {
    return this.abacService.evaluatePolicy(dto);
  }

  @Post('users/:userId/attributes')
  @Permissions('abac:manage')
  async assignUserAttributes(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: { attributeId: number; value: string; validUntil?: Date }[],
    @CurrentUser('id') createdBy: bigint,
  ) {
    return this.abacService.assignUserAttributes(BigInt(userId), dto, createdBy);
  }

  // Get user attributes
  @Get('users/:userId/attributes')
  @Permissions('abac:read')
  async getUserAttributes(@Param('userId', ParseIntPipe) userId: number) {
    return this.abacService.getUserAttributes(BigInt(userId));
  }

  // Update user attribute value
  @Put('users/:userId/attributes/:attributeId')
  @Permissions('abac:manage')
  async updateUserAttribute(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('attributeId', ParseIntPipe) attributeId: number,
    @Body() dto: { value: string; validUntil?: Date },
    @CurrentUser('id') updatedBy: bigint,
  ) {
    return this.abacService.updateUserAttribute(
      BigInt(userId),
      BigInt(attributeId),
      dto,
      updatedBy
    );
  }

  // Remove attribute from user
  @Delete('users/:userId/attributes/:attributeId')
  @Permissions('abac:manage')
  async removeUserAttribute(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('attributeId', ParseIntPipe) attributeId: number,
  ) {
    return this.abacService.removeUserAttribute(BigInt(userId), BigInt(attributeId));
  }


  @Post('resources/attributes')
  @Permissions('abac:manage')
  async assignResourceAttributes(
    @Body() dto: {
      resourceType: string;
      resourceId: number;
      attributeId: number;
      value: string;
      validUntil?: Date;
    },
    @CurrentUser('id') createdBy: bigint,
  ) {
    return this.abacService.assignResourceAttribute(dto, createdBy);
  }

  // Get resource attributes
  @Get('resources/:resourceType/:resourceId/attributes')
  @Permissions('abac:read')
  async getResourceAttributes(
    @Param('resourceType') resourceType: string,
    @Param('resourceId', ParseIntPipe) resourceId: number,
  ) {
    return this.abacService.getResourceAttributes(resourceType, BigInt(resourceId));
  }

  // Remove resource attribute
  @Delete('resources/:resourceType/:resourceId/attributes/:attributeId')
  @Permissions('abac:manage')
  async removeResourceAttribute(
    @Param('resourceType') resourceType: string,
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Param('attributeId', ParseIntPipe) attributeId: number,
  ) {
    return this.abacService.removeResourceAttribute(
      resourceType,
      BigInt(resourceId),
      BigInt(attributeId)
    );
  }
}




